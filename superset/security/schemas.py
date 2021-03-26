from marshmallow import fields, Schema

class AddSystemRoleSchema(Schema):
    role = fields.String(required=True)
    database = fields.String(required=True)
    sqlalchemy_uri = fields.String(required=True)
    datasets = fields.List(fields.Integer(), required=True)