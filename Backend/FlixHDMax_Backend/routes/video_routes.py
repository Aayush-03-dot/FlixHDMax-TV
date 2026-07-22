from urllib.parse import urlencode

import requests
from flask import current_app, flash, redirect, request, session, url_for

from models import Movie, Series
from utils.decorators import nocache


def register_video_routes(app):
    @app.route("/watch/hosted/<hosted_video_id>")
    @nocache
    def watch_hosted_video(hosted_video_id):
        if "user_id" not in session:
            return redirect(url_for("login"))

        video_host_base_url = current_app.config.get(
            "VIDEO_HOST_BASE_URL",
            "http://localhost:5050"
        ).rstrip("/")

        internal_api_key = current_app.config.get(
            "VIDEO_HOST_INTERNAL_API_KEY",
            ""
        )

        back_url = request.args.get("back") or "/"
        title = request.args.get("title") or "Video unavailable"

        if not back_url.startswith("/") or back_url.startswith("//"):
            back_url = "/"

        frontend_base_url = current_app.config.get(
            "FRONTEND_URL"
        ).rstrip("/")

        def redirect_video_unavailable(message="This video is not available to watch right now."):
            query = urlencode({
                "back": back_url,
                "title": title,
                "message": message,
            })

            return redirect(f"{frontend_base_url}/video-unavailable?{query}")

        try:
            response = requests.post(
                f"{video_host_base_url}/api/internal/watch-link/{hosted_video_id}",
                headers={
                    "X-Internal-Api-Key": internal_api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "ttl": 60 * 60 * 6
                },
                timeout=8,
            )

            print("VIDEO HOST STATUS:", response.status_code)
            print("VIDEO HOST RESPONSE:", response.text)

            try:
                data = response.json()
            except ValueError:
                return redirect_video_unavailable(
                    "The video player returned an invalid response. Please try again later."
                )

            if not response.ok:
                return redirect_video_unavailable(
                    data.get("message")
                    or data.get("error")
                    or "This video is not available right now."
                )

            absolute_watch_url = data.get("absolute_watch_url")

            if not absolute_watch_url:
                return redirect_video_unavailable(
                    "This video is not available to watch right now."
                )

            return redirect(absolute_watch_url)

        except Exception as e:
            print("HOSTED VIDEO REDIRECT ERROR:", e)

            return redirect_video_unavailable(
                "Could not open the video player right now. Please try again later."
            )

    @app.route("/download/<content_type>/<content_id>")
    def download_content(content_type, content_id):
        if "user_id" not in session:
            flash("Login required for downloads.", "error")
            return redirect(url_for("login"))

        item = (
            Movie.query.get(content_id)
            if content_type == "movie"
            else Series.query.get(content_id)
            if content_type == "series"
            else None
        )

        if not item or not item.download_url:
            flash("Download unavailable.", "error")
            return redirect(url_for("index"))

        return redirect(item.download_url)