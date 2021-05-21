import os
from urllib.parse import quote
import requests_oauthlib
import requests

from flask import redirect, request, session
from flask_appbuilder.security.sqla.models import User
from flask_appbuilder.security.views import AuthOIDView
from flask_appbuilder.views import expose
from flask_login import login_user, logout_user
from flask_appbuilder.security.manager import AUTH_OID
from superset.security import SupersetSecurityManager

# This allows us to use a plain HTTP callback
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

ATLAS_ADMIN_ROLE = 'sysadmin'
ATLAS_OPERATOR_ROLE = 'operator'


def get_atlas_provider(self):
    app = self.appbuilder.get_app
    return requests.get(app.config['ATLAS_DISCOVERY_URI']).json()


def handle_user_roles(self, superset_user=User, system_roles=list, user_roles=list):
    sm = self.appbuilder.sm
    gamma_role = sm.find_role('Gamma')
    admin_role = sm.find_role('Admin')

    for system in system_roles:
        system_role = sm.find_role(system)
        if system_role is not None and system_role not in superset_user.roles:
            superset_user.roles.append(system_role)

    for role in superset_user.roles:
        if role.name not in system_roles and role is not gamma_role and role is not admin_role:
            superset_user.roles.remove(role)

    if ATLAS_ADMIN_ROLE in user_roles:
        if gamma_role in superset_user.roles:
            superset_user.roles.remove(gamma_role)
        if admin_role not in superset_user.roles:
            superset_user.roles.append(admin_role)

    if ATLAS_OPERATOR_ROLE in user_roles:
        if admin_role in superset_user.roles:
            superset_user.roles.remove(admin_role)
        if gamma_role not in superset_user.roles:
            superset_user.roles.append(gamma_role)


class AuthOIDCView(AuthOIDView):
    @expose('/login/', methods=['GET'])
    def login(self, flag=True):
        app = self.appbuilder.get_app

        def handle_login():
            atlas_provider = get_atlas_provider(self)
            atlas_oauth = requests_oauthlib.OAuth2Session(
                client_id=app.config['ATLAS_CLIENT_ID'],
                redirect_uri=app.config['ATLAS_REDIRECT_URI'],
                scope=app.config['ATLAS_SCOPES']
            )
            authorization_url, _ = atlas_oauth.authorization_url(
                atlas_provider['authorization_endpoint'])
            return redirect(authorization_url)
        return handle_login()

    @expose('/signin-oidc', methods=['GET'])
    def callback(self):
        try:
            app = self.appbuilder.get_app
            sm = self.appbuilder.sm
            atlas_provider = get_atlas_provider(self)
            atlas_oauth = requests_oauthlib.OAuth2Session(
                client_id=app.config['ATLAS_CLIENT_ID'],
                redirect_uri=app.config['ATLAS_REDIRECT_URI']
            )
            atlas_oauth.fetch_token(
                token_url=atlas_provider['token_endpoint'],
                client_secret=app.config['ATLAS_CLIENT_SECRET'],
                authorization_response=request.url
            )

            atlas_user_info = atlas_oauth.get(
                atlas_provider['userinfo_endpoint']).json()
            atlas_user_roles = atlas_user_info.get('role', [])
            atlas_user_systems = atlas_user_info.get('system', [])

            if type(atlas_user_roles).__name__ != 'list':
                atlas_user_roles = [atlas_user_roles]
            if type(atlas_user_systems).__name__ != 'list':
                atlas_user_systems = [atlas_user_systems]

            if ATLAS_ADMIN_ROLE not in atlas_user_roles and ATLAS_OPERATOR_ROLE not in atlas_user_roles:
                return self.render_template(
                    'atlas/403.html',
                    username=atlas_user_info['name']), 403

            superset_user = sm.auth_user_oid(atlas_user_info['email'])

            if superset_user is None:
                superset_role = sm.find_role(
                    'Admin') if ATLAS_ADMIN_ROLE in atlas_user_roles else sm.find_role('Gamma')

                superset_user = sm.add_user(
                    atlas_user_info['email'],
                    atlas_user_info['name'],
                    atlas_user_info['name'],
                    atlas_user_info['email'],
                    superset_role)

            handle_user_roles(
                self,
                superset_user=superset_user,
                system_roles=atlas_user_systems,
                user_roles=atlas_user_roles)

            session['sub'] = atlas_user_info['sub']
            login_user(superset_user, remember=False)
            sm.get_session.commit()
            return redirect(self.appbuilder.get_url_for_index)
        except:
            return self.render_template(
                'atlas/403.html'), 403

    @expose('/signout-callback-oidc', methods=['GET'])
    def logout(self):
        atlas_provider = get_atlas_provider(self)

        logout_user()
        super(AuthOIDCView, self).logout()
        redirect_url = request.url_root.strip(
            '/') + self.appbuilder.get_url_for_login
        return redirect(
            atlas_provider['end_session_endpoint'] +
            '?ReturnUrl=' + quote(redirect_url))


class OIDCSecurityManager(SupersetSecurityManager):
    authoidview = AuthOIDCView

    def __init__(self, appbuilder):
        super(OIDCSecurityManager, self).__init__(appbuilder)
        if self.auth_type == AUTH_OID:
            self.oid = AuthOIDCView
