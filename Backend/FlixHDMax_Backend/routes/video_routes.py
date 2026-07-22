from urllib.parse import quote, urlencode, urlsplit, urlunsplit

import requests
from flask import current_app, flash, jsonify, redirect, request, session, url_for

from models import Movie, Series
from utils.decorators import nocache


def register_video_routes(app):
    def request_hosted_watch_link(hosted_video_id, ttl=60 * 60 * 6):
        video_host_base_url = current_app.config.get(
            "VIDEO_HOST_BASE_URL",
            "http://localhost:5050"
        ).rstrip("/")

        internal_api_key = current_app.config.get(
            "VIDEO_HOST_INTERNAL_API_KEY",
            ""
        )

        response = requests.post(
            f"{video_host_base_url}/api/internal/watch-link/{hosted_video_id}",
            headers={
                "X-Internal-Api-Key": internal_api_key,
                "Content-Type": "application/json",
            },
            json={"ttl": ttl},
            timeout=8,
        )

        try:
            data = response.json()
        except ValueError:
            data = {
                "error": "The video service returned an invalid response."
            }

        return response, data

    def build_master_url(absolute_watch_url, hosted_video_id):
        parsed = urlsplit(absolute_watch_url)

        if not parsed.scheme or not parsed.netloc or not parsed.query:
            return None

        stream_path = (
            f"/stream/{quote(str(hosted_video_id), safe='')}/master.m3u8"
        )

        return urlunsplit((
            parsed.scheme,
            parsed.netloc,
            stream_path,
            parsed.query,
            "",
        ))

    @app.route("/api/tv/hosted-playback/<hosted_video_id>")
    @nocache
    def tv_hosted_playback(hosted_video_id):
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "message": "Login required."
            }), 401

        try:
            response, data = request_hosted_watch_link(hosted_video_id)

            if not response.ok:
                return jsonify({
                    "success": False,
                    "message": (
                        data.get("message")
                        or data.get("error")
                        or "This video is not available right now."
                    ),
                }), response.status_code

            absolute_watch_url = data.get("absolute_watch_url")

            if not absolute_watch_url:
                return jsonify({
                    "success": False,
                    "message": "The video service did not return a playback URL."
                }), 502

            master_url = build_master_url(
                absolute_watch_url,
                hosted_video_id,
            )

            if not master_url:
                return jsonify({
                    "success": False,
                    "message": "The HLS playback URL could not be created."
                }), 502

            return jsonify({
                "success": True,
                "hosted_video_id": hosted_video_id,
                "master_url": master_url,
                "watch_url": absolute_watch_url,
                "expires_at": data.get("expires_at"),
                "playback_session_id": data.get("playback_session_id"),
            })

        except requests.RequestException as exc:
            print("TV HOSTED PLAYBACK REQUEST ERROR:", exc)
            return jsonify({
                "success": False,
                "message": "Could not connect to the video service."
            }), 502
        except Exception as exc:
            print("TV HOSTED PLAYBACK ERROR:", exc)
            return jsonify({
                "success": False,
                "message": "Could not prepare this video for playback."
            }), 500

    @app.route("/watch/hosted/<hosted_video_id>")
    @nocache
    def watch_hosted_video(hosted_video_id):
        if "user_id" not in session:
            return redirect(url_for("login"))

        back_url = request.args.get("back") or "/"
        title = request.args.get("title") or "Video unavailable"

        if not back_url.startswith("/") or back_url.startswith("//"):
            back_url = "/"

        frontend_base_url = current_app.config.get("FRONTEND_URL").rstrip("/")

        def redirect_video_unavailable(
            message="This video is not available to watch right now."
        ):
            query = urlencode({
                "back": back_url,
                "title": title,
                "message": message,
            })

            return redirect(f"{frontend_base_url}/video-unavailable?{query}")

        try:
            response, data = request_hosted_watch_link(hosted_video_id)

            print("VIDEO HOST STATUS:", response.status_code)
            print("VIDEO HOST RESPONSE:", response.text)

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

        except Exception as exc:
            print("HOSTED VIDEO REDIRECT ERROR:", exc)

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
