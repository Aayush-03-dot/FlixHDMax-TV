from flask import current_app
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature


def get_reset_serializer():
    return URLSafeTimedSerializer(current_app.secret_key)


def generate_password_reset_token(email):
    serializer = get_reset_serializer()
    return serializer.dumps(
        email,
        salt=current_app.config["PASSWORD_RESET_SALT"]
    )


def verify_password_reset_token(token, max_age=None):
    serializer = get_reset_serializer()

    try:
        email = serializer.loads(
            token,
            salt=current_app.config["PASSWORD_RESET_SALT"],
            max_age=max_age or current_app.config["PASSWORD_RESET_EXPIRES_SECONDS"]
        )
        return email

    except SignatureExpired:
        return None

    except BadSignature:
        return None