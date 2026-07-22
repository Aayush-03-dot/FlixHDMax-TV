import json

from flask import url_for

from models import Series
from services.media_service import get_display_thumbnail, get_display_backdrop
from services.my_list_service import _mylist_key


def parse_cast_list(cast_value):
    if not cast_value:
        return []

    try:
        cast_data = json.loads(cast_value)

        if isinstance(cast_data, list):
            return cast_data

        return []

    except (json.JSONDecodeError, TypeError):
        return [
            {
                "name": name.strip(),
                "profile_path": None
            }
            for name in str(cast_value).split(",")
            if name.strip()
        ]


def serialize_related_item(item):
    return {
        "id": item.id,
        "title": item.title,
        "content_type": item.content_type,
        "release_date": item.release_date,
        "rating": round(float(item.rating), 1) if getattr(item, "rating", None) is not None else None,
        "thumbnail_display": get_display_thumbnail(item),
        "poster_display": get_display_thumbnail(item),
        "backdrop_display": get_display_backdrop(item),
    }


def serialize_movie_detail(movie):
    return {
        "id": movie.id,
        "tmdb_id": movie.tmdb_id,
        "title": movie.title,
        "description": movie.description,
        "embed_code": movie.embed_code,
        "poster_url": movie.poster_url,
        "backdrop_url": movie.backdrop_url,
        "thumbnail": movie.thumbnail,
        "release_date": movie.release_date,
        "director": movie.director,
        "genre": movie.genre,
        "genre_list": movie.genre_list,
        "cast": parse_cast_list(movie.cast),
        "download_url": movie.download_url,
        "created_at": movie.created_at.isoformat() if movie.created_at else None,
        "content_type": movie.content_type,
        "display_thumbnail": get_display_thumbnail(movie),
        "poster_display": get_display_thumbnail(movie),
        "backdrop_display": get_display_backdrop(movie),
        "preview_url": getattr(movie, "preview_url", None),

        "video_source_type": getattr(movie, "video_source_type", "iframe"),
        "hosted_video_id": getattr(movie, "hosted_video_id", None),

        "hosted_watch_url": (
            url_for("watch_hosted_video", hosted_video_id=movie.hosted_video_id)
            if getattr(movie, "video_source_type", "iframe") == "hosted"
            and getattr(movie, "hosted_video_id", None)
            else None
        ),
    }


def serialize_episode_detail(episode):
    video_source_type = getattr(episode, "video_source_type", "iframe")
    hosted_video_id = getattr(episode, "hosted_video_id", None)

    return {
        "id": episode.id,
        "number": episode.number,
        "title": episode.title or f"Episode {episode.number}",
        "embed_code": episode.embed_code,
        "video_source_type": video_source_type,
        "hosted_video_id": hosted_video_id,
        "hosted_watch_url": (
            url_for("watch_hosted_video", hosted_video_id=hosted_video_id)
            if video_source_type == "hosted" and hosted_video_id
            else None
        ),
    }


def serialize_series_detail(series):
    seasons_data = []

    for season in series.seasons:
        seasons_data.append({
            "id": season.id,
            "title": season.title,
            "episodes": [
                serialize_episode_detail(episode)
                for episode in season.episodes
            ],
        })

    return {
        "id": series.id,
        "tmdb_id": series.tmdb_id,
        "title": series.title,
        "description": series.description,
        "poster_url": series.poster_url,
        "backdrop_url": series.backdrop_url,
        "thumbnail": series.thumbnail,
        "release_date": series.release_date,
        "director": series.director,
        "genre": series.genre,
        "genre_list": series.genre_list,
        "cast": parse_cast_list(series.cast),
        "download_url": series.download_url,
        "created_at": series.created_at.isoformat() if series.created_at else None,
        "last_updated_at": series.last_updated_at.isoformat() if series.last_updated_at else None,
        "content_type": series.content_type,
        "display_thumbnail": get_display_thumbnail(series),
        "poster_display": get_display_thumbnail(series),
        "backdrop_display": get_display_backdrop(series),
        "preview_url": getattr(series, "preview_url", None),
        "seasons": seasons_data,
    }


def serialize_home_item(item, my_list_keys=None):
    if not item:
        return None

    content_type = "series" if isinstance(item, Series) else "movie"
    my_list_keys = my_list_keys or set()

    return {
        "id": item.id,
        "title": item.title,
        "description": getattr(item, "description", "") or "",
        "release_date": getattr(item, "release_date", "") or "",
        "rating": round(float(item.rating), 1) if getattr(item, "rating", None) is not None else None,
        "content_type": content_type,
        "thumbnail_display": get_display_thumbnail(item),
        "poster_display": get_display_thumbnail(item),
        "backdrop_display": get_display_backdrop(item),
        "preview_url": getattr(item, "preview_url", None),
        "in_my_list": _mylist_key(content_type, item.id) in my_list_keys,
    }


def _safe_date_string(value):
    if not value:
        return ""

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return str(value)


def serialize_feed_item(item):
    content_type = "series" if isinstance(item, Series) else "movie"

    return {
        "id": item.id,
        "title": item.title,
        "description": getattr(item, "description", "") or "",
        "release_date": _safe_date_string(getattr(item, "release_date", "")),
        "content_type": content_type,
        "thumbnail_display": get_display_thumbnail(item),
        "rating": round(float(item.rating), 1) if getattr(item, "rating", None) is not None else None,
        "poster_display": get_display_thumbnail(item),
        "backdrop_display": get_display_backdrop(item),
        "preview_url": getattr(item, "preview_url", None),
    }


def attach_my_list_flag(item_data, my_list_keys):
    item_copy = dict(item_data)

    item_copy["in_my_list"] = (
        _mylist_key(item_copy["content_type"], item_copy["id"]) in my_list_keys
    )

    return item_copy


def attach_my_list_flags_to_rows(rows, my_list_keys):
    return [
        {
            "title": row["title"],
            "category": row.get("category"),
            "items": [
                attach_my_list_flag(item, my_list_keys)
                for item in row["items"]
            ]
        }
        for row in rows
    ]