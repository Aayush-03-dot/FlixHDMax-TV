import os
from datetime import timedelta

import certifi
from dotenv import load_dotenv
from flask_cors import CORS


load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


try:
    SSL_ARGS = {"ssl_ca": certifi.where()}
except Exception:
    SSL_ARGS = {}


class Config:
    SESSION_COOKIE_NAME = "_auth_fhdmax"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "False").lower() in ("true", "1", "t")

    MAIL_SERVER = os.getenv("MAIL_SERVER")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True").lower() in ("true", "1", "t")
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "False").lower() in ("true", "1", "t")


    PER_PAGE = 50
    OTP_EXPIRATION_MINUTES = 15

    SECRET_KEY = os.getenv("SECRET_KEY")
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

    VIDEO_HOST_INTERNAL_API_KEY = "dev-internal-video-key"
    VIDEO_HOST_BASE_URL = os.getenv("VIDEO_HOST_BASE_URL", "http://localhost:5050")

    

    FRONTEND_URL = os.getenv("FRONTEND_URL")

    UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
    PROFILE_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, "profiles")

    PASSWORD_RESET_SALT = os.getenv("PASSWORD_RESET_SALT", "flixhd-password-reset")
    PASSWORD_RESET_EXPIRES_SECONDS = int(os.getenv("PASSWORD_RESET_EXPIRES_SECONDS", 1800))

    TMDB_API_KEY = os.getenv("TMDB_API_KEY")
    TMDB_BASE_IMAGE_URL = "https://image.tmdb.org/t/p/w342"
    TMDB_BACKDROP_IMAGE_URL = "https://image.tmdb.org/t/p/w1280"

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": SSL_ARGS,
        "pool_recycle": 280,
    }

    SEND_FILE_MAX_AGE_DEFAULT = 60 * 60 * 24 * 30


def setup_cors(app):
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://192.168.8.211:5173",
                ],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True,
            }
        },
    )