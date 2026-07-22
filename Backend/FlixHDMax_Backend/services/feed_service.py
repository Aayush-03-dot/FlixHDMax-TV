import random
import threading
import time
from datetime import datetime

from extensions import db
from models import Movie, Series
from services.serializers import serialize_feed_item, serialize_home_item


# ==================== FAST GENRE CACHE ====================

_GENRE_CACHE = {
    "movies": {"ts": 0, "value": []},
    "series": {"ts": 0, "value": []},
}

_GENRE_CACHE_TTL_SECONDS = 300


def _extract_genres(rows):
    genres = set()

    for (genre_str,) in rows:
        if genre_str:
            for g in genre_str.split(","):
                g = g.strip()
                if g:
                    genres.add(g)

    return sorted(genres)


def _get_cached_movie_genres():
    now = time.time()
    cache = _GENRE_CACHE["movies"]

    if now - cache["ts"] > _GENRE_CACHE_TTL_SECONDS:
        rows = db.session.query(Movie.genre).filter(Movie.genre.isnot(None)).all()
        cache["value"] = _extract_genres(rows)
        cache["ts"] = now

    return cache["value"]


def _get_cached_series_genres():
    now = time.time()
    cache = _GENRE_CACHE["series"]

    if now - cache["ts"] > _GENRE_CACHE_TTL_SECONDS:
        rows = db.session.query(Series.genre).filter(Series.genre.isnot(None)).all()
        cache["value"] = _extract_genres(rows)
        cache["ts"] = now

    return cache["value"]


# ==================== OLD HOME CACHE USED BY index() ====================

_HOME_CACHE = {"ts": 0.0, "payload": None}
_HOME_CACHE_TTL_SECONDS = 1500


def clear_home_cache():
    # Old home cache used by old index()
    _HOME_CACHE["payload"] = None
    _HOME_CACHE["ts"] = 0.0

    # Genre cache, so new genres appear immediately
    _GENRE_CACHE["movies"]["ts"] = 0
    _GENRE_CACHE["movies"]["value"] = []

    _GENRE_CACHE["series"]["ts"] = 0
    _GENRE_CACHE["series"]["value"] = []

    # React homepage feed cache used by /api/home/initial and /api/home/rows
    global _HOME_FEED

    with _HOME_FEED_LOCK:
        _HOME_FEED = {
            "built_at": None,
            "featured_item": None,
            "carousel_rows": []
        }

    # React browse feed cache used by /api/browse/initial and /api/browse/rows
    global _BROWSE_FEED

    with _BROWSE_FEED_LOCK:
        _BROWSE_FEED = {
            "movie": {
                "built_at": None,
                "featured_item": None,
                "carousel_rows": []
            },
            "series": {
                "built_at": None,
                "featured_item": None,
                "carousel_rows": []
            }
        }


# ==================== BROWSE FEED CACHE ====================

_BROWSE_FEED_LOCK = threading.Lock()

_BROWSE_FEED = {
    "movie": {
        "built_at": None,
        "featured_item": None,
        "carousel_rows": []
    },
    "series": {
        "built_at": None,
        "featured_item": None,
        "carousel_rows": []
    }
}


def _browse_sort_key(item):
    if isinstance(item, Series):
        return item.last_updated_at

    return item.created_at


def _get_browse_content_type(item):
    return "series" if isinstance(item, Series) else "movie"


def _add_browse_feed_row(feed_rows, title, items, category_slug=None, limit=20):
    row_items = []

    for item in items:
        row_items.append(serialize_feed_item(item))

        if len(row_items) >= limit:
            break

    if row_items:
        feed_rows.append({
            "title": title,
            "category": category_slug,
            "items": row_items
        })


def build_browse_feed(content_type):
    carousel_rows = []

    if content_type == "movie":
        title_prefix = "Movies"
        first_row_title = "New Movies"
        all_category = "all-movies"

        latest_items = Movie.query.order_by(
            db.desc(Movie.created_at)
        ).limit(80).all()

        genres = _get_cached_movie_genres()

    elif content_type == "series":
        title_prefix = "TV Shows"
        first_row_title = "New TV Shows"
        all_category = "all-series"

        latest_items = Series.query.order_by(
            db.desc(Series.last_updated_at)
        ).limit(80).all()

        genres = _get_cached_series_genres()

    else:
        raise ValueError("Invalid browse content type")

    featured_item = None
    featured_candidates = latest_items[:20]

    if featured_candidates:
        featured_item = random.choice(featured_candidates)

    _add_browse_feed_row(
        carousel_rows,
        first_row_title,
        latest_items,
        all_category
    )

    genre_pool = sorted(list(set(genres)), key=lambda genre: genre.lower())

    for genre in genre_pool:
        if len(carousel_rows) >= 18:
            break

        if content_type == "movie":
            items = Movie.query.filter(
                Movie.genre.like(f"%{genre}%")
            ).order_by(db.desc(Movie.created_at)).limit(80).all()

            row_title = f"{genre} Movies"

        else:
            items = Series.query.filter(
                Series.genre.like(f"%{genre}%")
            ).order_by(db.desc(Series.last_updated_at)).limit(80).all()

            row_title = f"{genre} TV Shows"

        _add_browse_feed_row(
            carousel_rows,
            row_title,
            items,
            None
        )

    return {
        "built_at": datetime.utcnow().isoformat(),
        "page_title": title_prefix,
        "content_type": content_type,
        "featured_item": serialize_feed_item(featured_item) if featured_item else None,
        "carousel_rows": carousel_rows
    }


def rebuild_browse_feed(content_type):
    global _BROWSE_FEED

    new_feed = build_browse_feed(content_type)

    with _BROWSE_FEED_LOCK:
        _BROWSE_FEED[content_type] = new_feed

    return new_feed


def get_browse_feed(content_type):
    global _BROWSE_FEED

    with _BROWSE_FEED_LOCK:
        feed = _BROWSE_FEED.get(content_type)
        has_feed = bool(feed and feed.get("carousel_rows"))

    if not has_feed:
        return rebuild_browse_feed(content_type)

    with _BROWSE_FEED_LOCK:
        feed = _BROWSE_FEED[content_type]

        return {
            "built_at": feed.get("built_at"),
            "page_title": feed.get("page_title"),
            "content_type": feed.get("content_type"),
            "featured_item": feed.get("featured_item"),
            "carousel_rows": list(feed.get("carousel_rows", []))
        }


def normalize_browse_type(value):
    if value in ("movie", "movies", "all-movies"):
        return "movie"

    if value in ("series", "tv", "shows", "all-series"):
        return "series"

    return None


# ==================== NEW HOMEPAGE FEED CACHE ====================

_HOME_FEED_LOCK = threading.Lock()

_HOME_FEED = {
    "built_at": None,
    "featured_item": None,
    "carousel_rows": []
}


def serialize_carousel_row(title, category_slug, items, used_ids, my_list_keys, limit=20):
    row_items = []

    for item in items:
        content_type = "series" if isinstance(item, Series) else "movie"
        item_key = (content_type, item.id)

        if item_key in used_ids:
            continue

        used_ids.add(item_key)
        row_items.append(item)

        if len(row_items) >= limit:
            break

    if not row_items:
        return None

    return {
        "title": title,
        "category": category_slug,
        "items": [
            serialize_home_item(item, my_list_keys)
            for item in row_items
        ]
    }


def build_home_rows_until(max_rows, my_list_keys):
    used_ids = set()
    carousel_rows = []

    new_movies = Movie.query.order_by(db.desc(Movie.created_at)).limit(30).all()
    new_series = Series.query.order_by(db.desc(Series.last_updated_at)).limit(30).all()

    mixed_new = new_movies + new_series
    mixed_new.sort(
        key=lambda x: x.last_updated_at if isinstance(x, Series) else x.created_at,
        reverse=True
    )

    row = serialize_carousel_row(
        "New Releases",
        "all",
        mixed_new,
        used_ids,
        my_list_keys
    )

    if row:
        carousel_rows.append(row)

    if len(carousel_rows) >= max_rows:
        return carousel_rows

    top_series = Series.query.order_by(
        db.desc(Series.last_updated_at)
    ).limit(80).all()

    row = serialize_carousel_row(
        "Top Series",
        "all-series",
        top_series,
        used_ids,
        my_list_keys
    )

    if row:
        carousel_rows.append(row)

    if len(carousel_rows) >= max_rows:
        return carousel_rows

    movie_genres = _get_cached_movie_genres()
    series_genres = _get_cached_series_genres()

    genre_pool = sorted(
        list(set(movie_genres + series_genres)),
        key=lambda genre: genre.lower()
    )

    for genre in genre_pool:
        if len(carousel_rows) >= max_rows:
            break

        movies = Movie.query.filter(
            Movie.genre.like(f"%{genre}%")
        ).order_by(db.desc(Movie.created_at)).limit(50).all()

        series = Series.query.filter(
            Series.genre.like(f"%{genre}%")
        ).order_by(db.desc(Series.last_updated_at)).limit(50).all()

        mixed = movies + series
        mixed.sort(
            key=lambda x: x.last_updated_at if isinstance(x, Series) else x.created_at,
            reverse=True
        )

        row = serialize_carousel_row(
            f"{genre} Picks",
            genre,
            mixed,
            used_ids,
            my_list_keys
        )

        if row:
            carousel_rows.append(row)

    return carousel_rows


def _add_feed_row(feed_rows, title, items, category_slug, used_ids, limit=20):
    row_items = []

    for item in items:
        content_type = "series" if isinstance(item, Series) else "movie"
        item_key = (content_type, item.id)

        if item_key in used_ids:
            continue

        used_ids.add(item_key)
        row_items.append(serialize_feed_item(item))

        if len(row_items) >= limit:
            break

    if row_items:
        feed_rows.append({
            "title": title,
            "category": category_slug,
            "items": row_items
        })


def build_homepage_feed():
    used_ids = set()
    carousel_rows = []

    newest_movie = Movie.query.order_by(db.desc(Movie.created_at)).first()
    newest_series = Series.query.order_by(db.desc(Series.last_updated_at)).first()

    featured_item = None
    candidates = [item for item in [newest_movie, newest_series] if item]

    if candidates:
        featured_item = sorted(
            candidates,
            key=lambda x: x.last_updated_at if isinstance(x, Series) else x.created_at,
            reverse=True
        )[0]

    new_movies = Movie.query.order_by(db.desc(Movie.created_at)).limit(40).all()
    new_series = Series.query.order_by(db.desc(Series.last_updated_at)).limit(40).all()

    mixed_new = new_movies + new_series
    mixed_new.sort(
        key=lambda x: x.last_updated_at if isinstance(x, Series) else x.created_at,
        reverse=True
    )

    _add_feed_row(
        carousel_rows,
        "New Releases",
        mixed_new,
        "all",
        used_ids
    )

    top_series = Series.query.order_by(
        db.desc(Series.last_updated_at)
    ).limit(80).all()

    _add_feed_row(
        carousel_rows,
        "Top Series",
        top_series,
        "all-series",
        used_ids
    )

    movie_genres = _get_cached_movie_genres()
    series_genres = _get_cached_series_genres()

    genre_pool = sorted(
        list(set(movie_genres + series_genres)),
        key=lambda genre: genre.lower()
    )

    for genre in genre_pool:
        if len(carousel_rows) >= 18:
            break

        movies = Movie.query.filter(
            Movie.genre.like(f"%{genre}%")
        ).order_by(db.desc(Movie.created_at)).limit(60).all()

        series = Series.query.filter(
            Series.genre.like(f"%{genre}%")
        ).order_by(db.desc(Series.last_updated_at)).limit(60).all()

        mixed = movies + series
        mixed.sort(
            key=lambda x: x.last_updated_at if isinstance(x, Series) else x.created_at,
            reverse=True
        )

        _add_feed_row(
            carousel_rows,
            f"{genre} Picks",
            mixed,
            genre,
            used_ids
        )

    return {
        "built_at": datetime.utcnow().isoformat(),
        "featured_item": serialize_feed_item(featured_item) if featured_item else None,
        "carousel_rows": carousel_rows
    }


def rebuild_homepage_feed():
    global _HOME_FEED

    new_feed = build_homepage_feed()

    with _HOME_FEED_LOCK:
        _HOME_FEED = new_feed

    return new_feed


def get_homepage_feed():
    global _HOME_FEED

    with _HOME_FEED_LOCK:
        has_feed = bool(_HOME_FEED.get("carousel_rows"))

    if not has_feed:
        return rebuild_homepage_feed()

    with _HOME_FEED_LOCK:
        return {
            "built_at": _HOME_FEED.get("built_at"),
            "featured_item": _HOME_FEED.get("featured_item"),
            "carousel_rows": list(_HOME_FEED.get("carousel_rows", []))
        }