import os
import re
import secrets
from datetime import datetime

from flask import redirect, session, url_for, flash
from werkzeug.security import generate_password_hash

from extensions import db, oauth
from models import User


def make_username_from_email(email):
    base = (email.split("@")[0] if email else "googleuser").lower()
    base = re.sub(r"[^a-z0-9_]", "", base)

    if not base:
        base = "googleuser"

    username = base
    counter = 1

    while User.query.filter_by(username=username).first():
        username = f"{base}{counter}"
        counter += 1

    return username


def set_login_session(user):
    session.clear()
    session["user_id"] = user.id
    session["user"] = user.username
    session["user_role"] = user.role

    user.last_login_at = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1

    db.session.commit()


def get_frontend_url():
    return os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


def clean_rating(value):
    if value is None or value == "":
        return None

    try:
        rating = float(value)
    except (TypeError, ValueError):
        return None

    if rating < 0:
        return None

    return round(rating, 1)