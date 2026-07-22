from flask import current_app, url_for


def get_display_thumbnail(item):
    if item.poster_url:
        return item.poster_url

    if item.thumbnail:
        return url_for("uploaded_file", filename=item.thumbnail, _external=True)

    return url_for("static", filename="default_poster.jpg", _external=True)


def get_display_backdrop(item):
    if hasattr(item, "backdrop_url") and item.backdrop_url:
        return item.backdrop_url

    return get_display_thumbnail(item)


def get_profile_image_url(user):
    if user and getattr(user, "profile_image", None):
        return url_for("uploaded_file", filename=f"profiles/{user.profile_image}")

    return url_for("static", filename="default_profile.png")


def get_video_watch_url(item):
    if not item:
        return None

    video_source_type = getattr(item, "video_source_type", "iframe")
    hosted_video_id = getattr(item, "hosted_video_id", None)

    if video_source_type == "hosted" and hosted_video_id:
        video_host_base_url = current_app.config.get(
            "VIDEO_HOST_BASE_URL",
            "http://localhost:5050"
        )
        return f"{video_host_base_url}/watch/{hosted_video_id}"

    return None