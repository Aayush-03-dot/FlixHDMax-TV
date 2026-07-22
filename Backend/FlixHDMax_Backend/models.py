import json
import uuid
from datetime import datetime

from extensions import db
from services.media_service import get_display_thumbnail, get_display_backdrop


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)

    role = db.Column(db.String(20), nullable=False, default="user")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    last_login_at = db.Column(db.DateTime, nullable=True)
    login_count = db.Column(db.Integer, nullable=False, default=0)
    password_changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    google_id = db.Column(db.String(255), unique=True, nullable=True, index=True)
    auth_provider = db.Column(db.String(30), nullable=False, default="local")

    profile_image = db.Column(db.String(255), nullable=True)
    display_name = db.Column(db.String(100), nullable=True)

    def to_dict(self, include_sensitive=False):
        user_dict = {
            "id": self.id,
            "username": self.username,
            "display_name": self.display_name,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "login_count": self.login_count,
            "profile_image": self.profile_image,
            "google_id": self.google_id,
            "auth_provider": self.auth_provider,
        }
        return user_dict


class PendingUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)

    otp = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "otp": self.otp,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Movie(db.Model):
    __tablename__ = "movie"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tmdb_id = db.Column(db.String(20), nullable=True, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)

    embed_code = db.Column(db.Text, nullable=False)

    video_source_type = db.Column(db.String(20), nullable=False, default="iframe")
    hosted_video_id = db.Column(db.String(80), nullable=True)

    poster_url = db.Column(db.String(255), nullable=True)
    backdrop_url = db.Column(db.String(255), nullable=True)
    thumbnail = db.Column(db.String(255), nullable=True)
    preview_url = db.Column(db.Text, nullable=True)

    release_date = db.Column(db.String(20), nullable=True)
    rating = db.Column(db.Float, nullable=True)
    director = db.Column(db.String(100), nullable=True)
    genre = db.Column(db.Text, nullable=True)
    cast = db.Column(db.Text, nullable=True)
    download_url = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    content_type = db.Column(db.String(20), nullable=False, default="movie")

    @property
    def genre_list(self):
        return [g.strip() for g in self.genre.split(",")] if self.genre else []

    def to_dict(self):
        cast_list = []
        cast_display_string = ""

        if self.cast:
            try:
                cast_data = json.loads(self.cast)
                cast_list = cast_data
                cast_display_string = ", ".join([
                    actor.get("name", "") if isinstance(actor, dict) else str(actor)
                    for actor in cast_data
                ])
            except (json.JSONDecodeError, TypeError):
                cast_list = []
                cast_display_string = self.cast

        return {
            "id": self.id,
            "tmdb_id": self.tmdb_id,
            "title": self.title,
            "description": self.description,
            "embed_code": self.embed_code,
            "video_source_type": self.video_source_type,
            "hosted_video_id": self.hosted_video_id,
            "poster_url": self.poster_url,
            "backdrop_url": self.backdrop_url,
            "thumbnail": self.thumbnail,
            "preview_url": self.preview_url,
            "release_date": self.release_date,
            "rating": round(float(self.rating), 1) if self.rating is not None else None,
            "director": self.director,
            "genre": self.genre,
            "cast": cast_list,
            "cast_display_string": cast_display_string,
            "created_at": self.created_at.isoformat(),
            "content_type": self.content_type,
            "display_thumbnail": get_display_thumbnail(self),
        }


class Series(db.Model):
    __tablename__ = "series"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tmdb_id = db.Column(db.String(20), nullable=True, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)

    poster_url = db.Column(db.String(255), nullable=True)
    backdrop_url = db.Column(db.String(255), nullable=True)
    thumbnail = db.Column(db.String(255), nullable=True)
    preview_url = db.Column(db.Text, nullable=True)

    release_date = db.Column(db.String(20), nullable=True)
    rating = db.Column(db.Float, nullable=True)
    director = db.Column(db.String(100), nullable=True)
    genre = db.Column(db.Text, nullable=True)
    cast = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    last_updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    content_type = db.Column(db.String(20), nullable=False, default="series")

    seasons = db.relationship(
        "Season",
        backref="series",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="Season.id"
    )

    download_url = db.Column(db.Text, nullable=True)

    @property
    def genre_list(self):
        return [g.strip() for g in self.genre.split(",")] if self.genre else []

    def to_dict(self):
        cast_list = []
        cast_display_string = ""

        if self.cast:
            try:
                cast_data = json.loads(self.cast)
                cast_list = cast_data
                cast_display_string = ", ".join([
                    actor.get("name", "") if isinstance(actor, dict) else str(actor)
                    for actor in cast_data
                ])
            except (json.JSONDecodeError, TypeError):
                cast_list = []
                cast_display_string = self.cast

        return {
            "id": self.id,
            "tmdb_id": self.tmdb_id,
            "title": self.title,
            "description": self.description,
            "poster_url": self.poster_url,
            "backdrop_url": self.backdrop_url,
            "thumbnail": self.thumbnail,
            "preview_url": self.preview_url,
            "release_date": self.release_date,
            "rating": round(float(self.rating), 1) if self.rating is not None else None,
            "director": self.director,
            "genre": self.genre,
            "cast": cast_list,
            "cast_display_string": cast_display_string,
            "created_at": self.created_at.isoformat(),
            "content_type": self.content_type,
            "display_thumbnail": get_display_thumbnail(self),
            "download_url": self.download_url,
            "backdrop_display": get_display_backdrop(self),
            "last_updated_at": self.last_updated_at.isoformat() if self.last_updated_at else None,
        }

class Season(db.Model):
    __tablename__ = "season"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    series_id = db.Column(db.String(36), db.ForeignKey("series.id"), nullable=False)

    episodes = db.relationship(
        "Episode",
        backref="season",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="Episode.number"
    )


class Episode(db.Model):
    __tablename__ = "episode"

    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=True)
    embed_code = db.Column(db.Text, nullable=True)
    video_source_type = db.Column(db.String(20), nullable=False, default="iframe")
    hosted_video_id = db.Column(db.String(80), nullable=True)
    season_id = db.Column(db.Integer, db.ForeignKey("season.id"), nullable=False)


class MovieRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True, index=True)

    title = db.Column(db.String(200), nullable=False)
    link = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="Pending")
    date = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="movie_requests")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "requester_username": self.user.username if self.user else None,
            "requester_email": self.user.email if self.user else None,
            "title": self.title,
            "link": self.link,
            "notes": self.notes,
            "status": self.status,
            "date": self.date.strftime("%b %d, %Y"),
        }


class ContactMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(200), nullable=True)
    message = db.Column(db.Text, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), nullable=False, default="New")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "subject": self.subject,
            "message": self.message,
            "date": self.date.strftime("%b %d, %Y %H:%M"),
            "status": self.status,
        }


class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), default="info")
    image_url = db.Column(db.String(255), nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "image_url": self.image_url,
            "is_read": self.is_read,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
            "time_ago": self.time_ago(),
        }

    def time_ago(self):
        now = datetime.utcnow()
        diff = now - self.created_at

        if diff.days > 0:
            return f"{diff.days}d ago"

        if diff.seconds > 3600:
            return f"{diff.seconds // 3600}h ago"

        if diff.seconds > 60:
            return f"{diff.seconds // 60}m ago"

        return "Just now"


class UserList(db.Model):
    __tablename__ = "user_list"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)

    content_id = db.Column(db.String(36), nullable=False, index=True)
    content_type = db.Column(db.String(20), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        db.UniqueConstraint("user_id", "content_id", "content_type", name="uq_user_list_item"),
    )


class Page(db.Model):
    __tablename__ = "page"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    content = db.Column(db.Text, nullable=False, default="")
    meta_description = db.Column(db.String(255), nullable=True)
    is_published = db.Column(db.Boolean, default=True)
    is_system = db.Column(db.Boolean, default=False)
    show_in_footer = db.Column(db.Boolean, default=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "key": self.key,
            "title": self.title,
            "slug": self.slug,
            "content": self.content,
            "meta_description": self.meta_description,
            "is_published": self.is_published,
            "is_system": self.is_system,
            "show_in_footer": self.show_in_footer,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }