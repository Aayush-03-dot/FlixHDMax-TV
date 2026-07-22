from flask import current_app, render_template
from flask_mail import Message

from extensions import mail
from services.token_service import generate_password_reset_token


def send_otp_email(recipient_email, otp):
    try:
        html_content = render_template("otp_email.html", otp=otp)

        msg = Message(
            "Your OTP for FlixHD",
            sender=("FlixHD", current_app.config["MAIL_USERNAME"]),
            recipients=[recipient_email],
            html=html_content
        )

        mail.send(msg)

    except Exception as e:
        print(f"---!!! FAILED TO SEND EMAIL: {e} !!!---")

        import traceback
        traceback.print_exc()

        raise RuntimeError(f"Email service is currently unavailable: {e}")


def send_password_reset_email(user):
    try:
        token = generate_password_reset_token(user.email)

        frontend_url = current_app.config.get("FRONTEND_URL")
        reset_link = f"{frontend_url}/reset-password/{token}"

        html_content = render_template(
            "password_reset_email.html",
            user=user,
            reset_link=reset_link,
            expires_minutes=current_app.config["PASSWORD_RESET_EXPIRES_SECONDS"] // 60
        )

        msg = Message(
            "Reset your FlixHD password",
            sender=("FlixHD", current_app.config["MAIL_USERNAME"]),
            recipients=[user.email],
            html=html_content
        )

        mail.send(msg)

    except Exception as e:
        print(f"---!!! FAILED TO SEND PASSWORD RESET EMAIL: {e} !!!---")

        import traceback
        traceback.print_exc()

        raise RuntimeError(f"Password reset email service is currently unavailable: {e}")