import argparse
import time

import requests

from app import app
from extensions import db
from models import Movie, Series


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


def fetch_tmdb_rating(api_key, content_type, tmdb_id=None, title=None, fallback_title=False):
    tmdb_path = "tv" if content_type == "series" else "movie"

    try:
        tmdb_data = None

        if tmdb_id:
            response = requests.get(
                f"https://api.themoviedb.org/3/{tmdb_path}/{tmdb_id}",
                params={"api_key": api_key},
                timeout=15,
            )
            response.raise_for_status()
            tmdb_data = response.json()

        elif fallback_title and title:
            search_response = requests.get(
                f"https://api.themoviedb.org/3/search/{tmdb_path}",
                params={
                    "api_key": api_key,
                    "query": title,
                },
                timeout=15,
            )
            search_response.raise_for_status()

            results = search_response.json().get("results") or []

            if not results:
                return None, "No TMDB match found"

            tmdb_id = results[0].get("id")

            if not tmdb_id:
                return None, "TMDB match had no ID"

            detail_response = requests.get(
                f"https://api.themoviedb.org/3/{tmdb_path}/{tmdb_id}",
                params={"api_key": api_key},
                timeout=15,
            )
            detail_response.raise_for_status()
            tmdb_data = detail_response.json()

        else:
            return None, "Missing TMDB ID"

        rating = clean_rating(tmdb_data.get("vote_average"))

        if rating is None:
            return None, "TMDB rating unavailable"

        return rating, None

    except requests.exceptions.RequestException as error:
        return None, f"TMDB request failed: {error}"


def get_items(content_type, limit, force):
    items = []

    if content_type in ("all", "movie"):
        movie_query = Movie.query

        if not force:
            movie_query = movie_query.filter(Movie.rating.is_(None))

        movies = movie_query.order_by(Movie.created_at.desc()).limit(limit).all()
        items.extend(("movie", movie) for movie in movies)

    remaining = max(0, limit - len(items))

    if content_type in ("all", "series") and remaining > 0:
        series_query = Series.query

        if not force:
            series_query = series_query.filter(Series.rating.is_(None))

        series_items = (
            series_query
            .order_by(Series.created_at.desc())
            .limit(remaining)
            .all()
        )

        items.extend(("series", series) for series in series_items)

    return items


def main():
    parser = argparse.ArgumentParser(
        description="Backfill missing TMDB ratings for existing movies and series."
    )

    parser.add_argument(
        "--type",
        choices=["all", "movie", "series"],
        default="all",
        help="Which content type to update.",
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Maximum number of items to check in one run.",
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Update ratings even if a rating already exists.",
    )

    parser.add_argument(
        "--fallback-title",
        action="store_true",
        help="If tmdb_id is missing, search TMDB by title. Use carefully.",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be updated without saving changes.",
    )

    parser.add_argument(
        "--sleep",
        type=float,
        default=0.25,
        help="Delay between TMDB requests to be gentle with the API.",
    )

    args = parser.parse_args()

    with app.app_context():
        api_key = app.config.get("TMDB_API_KEY")

        if not api_key:
            print("ERROR: TMDB_API_KEY is not configured.")
            return

        limit = max(1, min(args.limit, 500))
        items = get_items(args.type, limit, args.force)

        if not items:
            print("No items found to update.")
            return

        print(f"Checking {len(items)} item(s)...")
        print("-" * 70)

        updated = 0
        skipped = 0

        for item_type, item in items:
            rating, error = fetch_tmdb_rating(
                api_key=api_key,
                content_type=item_type,
                tmdb_id=item.tmdb_id,
                title=item.title,
                fallback_title=args.fallback_title,
            )

            if rating is None:
                skipped += 1
                print(f"SKIP  [{item_type}] {item.title} → {error}")
                continue

            old_rating = item.rating

            print(
                f"UPDATE [{item_type}] {item.title} "
                f"→ {old_rating} -> {rating}"
            )

            if not args.dry_run:
                item.rating = rating

            updated += 1
            time.sleep(args.sleep)

        if args.dry_run:
            db.session.rollback()
            print("-" * 70)
            print(f"DRY RUN finished. Would update {updated}, skipped {skipped}.")
            return

        db.session.commit()

        print("-" * 70)
        print(f"Done. Updated {updated}, skipped {skipped}.")
        print("Restart Flask after this so cached homepage data refreshes.")


if __name__ == "__main__":
    main()