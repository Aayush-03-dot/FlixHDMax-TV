from flask import session

from models import Page, User
from services.feed_service import _get_cached_movie_genres, _get_cached_series_genres
from services.media_service import get_profile_image_url


def register_context_processors(app):
    @app.context_processor
    def inject_movie_genres():
        return {
            "movie_genres": _get_cached_movie_genres()
        }

    @app.context_processor
    def inject_series_genres():
        return {
            "series_genres": _get_cached_series_genres()
        }

    @app.context_processor
    def inject_profile_img():
        user_obj = None

        if session.get("user_id"):
            user_obj = User.query.get(session["user_id"])

        return {
            "profile_img": get_profile_image_url(user_obj) if user_obj else None
        }

    @app.context_processor
    def inject_user_identity():
        user_obj = None

        if session.get("user_id"):
            user_obj = User.query.get(session["user_id"])

        return {
            "profile_img": get_profile_image_url(user_obj) if user_obj else None,
            "display_name": (
                user_obj.display_name if user_obj and user_obj.display_name
                else user_obj.username if user_obj
                else None
            )
        }

    @app.context_processor
    def inject_footer_pages():
        try:
            pages = Page.query.filter_by(
                is_published=True,
                show_in_footer=True
            ).order_by(
                Page.title.asc()
            ).all()

        except Exception:
            pages = []

        return {
            "footer_pages": pages
        }