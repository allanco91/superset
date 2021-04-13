# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
import logging

from flask import request, Response
from flask_appbuilder import expose
from flask_appbuilder.api import BaseApi, safe
from flask_appbuilder.security.decorators import permission_name, protect
from flask_wtf.csrf import generate_csrf

from marshmallow import ValidationError
from superset.utils import core as utils
from superset.extensions import event_logger
from superset.datasets.dao import DatasetDAO
from superset.security.schemas import AddSystemRoleSchema

logger = logging.getLogger(__name__)


class SecurityRestApi(BaseApi):
    resource_name = "security"
    allow_browser_login = True
    openapi_spec_tag = "Security"

    add_model_schema = AddSystemRoleSchema()

    @expose("/add_system_role/", methods=["POST"])
    @protect()
    @safe
    @permission_name("read")
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.role",
        log_to_statsd=False,
    )
    def role(self) -> Response:
        """Creates a new system role
        ---
        post:
          description: >-
            Create a new System role
          requestBody:
            description: Add system role schema
            required: true
            content:
              application/json:
                schema:
                    type: object
                    properties:
                        role:
                            type: string
                            required: true
                        database:
                            type: string
                            required: true
                        sqlalchemy_uri:
                            type: string
                            required: true
                        datasets:
                            type: array
                            items:
                                type: integer
                            required: true
          responses:
            200:
              description: System role added
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      message:
                        type: string
            400:
              $ref: '#/components/responses/400'
            401:
              $ref: '#/components/responses/401'
            500:
              $ref: '#/components/responses/500'
        """
        if not request.is_json:
            return self.response_400(message="Request is not JSON")
        try:
            request_body = self.add_model_schema.load(request.json)

            sm = self.appbuilder.sm

            database = utils.get_or_create_db(
                request_body['database'],
                request_body['sqlalchemy_uri'])
            database_permission = sm.add_permission_view_menu(
                "database_access",
                database.perm)

            system_role = sm.add_role(request_body['role'])
            sm.add_permission_role(system_role, database_permission)

            for dataset_id in request_body['datasets']:
                dataset = DatasetDAO.find_by_id(dataset_id)
                dataset_permission = sm.add_permission_view_menu(
                    "datasource_access",
                    dataset.perm)
                sm.add_permission_role(system_role, dataset_permission)

            sm.get_session.commit()

            return self.response(200, message="OK")

        # This validates custom Schema with custom validations
        except ValidationError as error:
            return self.response_400(message=error.messages)

    @expose("/csrf_token/", methods=["GET"])
    @event_logger.log_this
    @protect()
    @safe
    @permission_name("read")
    def csrf_token(self) -> Response:
        """
        Return the csrf token
        ---
        get:
          description: >-
            Fetch the CSRF token
          responses:
            200:
              description: Result contains the CSRF token
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                        result:
                          type: string
            401:
              $ref: '#/components/responses/401'
            500:
              $ref: '#/components/responses/500'
        """
        return self.response(200, result=generate_csrf())
