# imports all necessary libraries and module for this application. 
import gzip
import io
import zlib

from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timezone

from datetime import datetime, timedelta
from sqlalchemy import or_, cast, String, func

import urllib.request
import urllib.error
from urllib.parse import urlencode
from flask_wtf.csrf import generate_csrf
import os
import uuid
import requests
import json
import time

from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError
import pymysql
from sqlalchemy import or_, cast, String
from sqlalchemy.exc import IntegrityError

from utils.helper_function import clean_rating
from config import Config, setup_cors
from extensions import db, mail, csrf, migrate, oauth
from forms import MyBaseForm
from models import (
    User,
    PendingUser,
    Movie,
    Series,
    Season,
    Episode,
    MovieRequest,
    ContactMessage,
    Notification,
    
    Page,
    UserList,
)

from routes.api_routes import register_api_routes
from routes.auth_api_routes import register_auth_api_routes
from routes.legal_routes import register_legal_routes
from routes.upload_routes import register_upload_routes
from routes.user_page_routes import register_user_page_routes
from routes.video_routes import register_video_routes
from routes.admin_routes import register_admin_routes

from services.analytics_service import (
    utc_dt_ms,
    get_device_type,
    get_db_connection,
    rows_to_dicts,
    _parse_date_range,
    _fetch_dicts,
)
from services.context_service import register_context_processors
from services.feed_service import (
    
    clear_home_cache,
   
    rebuild_browse_feed,
    rebuild_homepage_feed,
)


from services.system_page import ensure_system_pages
from services.security_service import register_security_hooks

from services.tmdb_service import get_tmdb_movie_director, get_tmdb_top_actors

from utils.decorators import admin_required,  nocache

from utils.uploads import allowed_file

# --- Load Environment Variables ---

# --- Load Environment Variables ---
pymysql.install_as_MySQLdb()

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)
app.config.from_object(Config)

setup_cors(app)

app.secret_key = app.config["SECRET_KEY"]
app.permanent_session_lifetime = app.config["PERMANENT_SESSION_LIFETIME"]

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(app.config["PROFILE_UPLOAD_FOLDER"], exist_ok=True)

db.init_app(app)
mail.init_app(app)
csrf.init_app(app)
migrate.init_app(app, db)
oauth.init_app(app)

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD_HASH = generate_password_hash(os.getenv("ADMIN_PASSWORD"))

app.config["ADMIN_USERNAME"] = ADMIN_USERNAME
app.config["ADMIN_PASSWORD_HASH"] = ADMIN_PASSWORD_HASH


google = oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile",
    },
    token_endpoint_auth_method="client_secret_post",
)

register_security_hooks(app)
register_context_processors(app)
register_upload_routes(app)



register_legal_routes(app)
register_user_page_routes(app)
register_video_routes(app)
register_api_routes(app)
register_auth_api_routes(app)
register_admin_routes(app)
# --- Helper Functions ---



VIDEO_HOSTING_INTERNAL_URL = (
    os.environ.get("VIDEO_HOSTING_INTERNAL_URL") or ""
).strip().rstrip("/")

VIDEO_HOSTING_INTERNAL_API_KEY = (
    os.environ.get("VIDEO_HOSTING_INTERNAL_API_KEY") or ""
).strip()

if not VIDEO_HOSTING_INTERNAL_URL:
    raise RuntimeError("VIDEO_HOSTING_INTERNAL_URL is not set.")

if not VIDEO_HOSTING_INTERNAL_API_KEY:
    raise RuntimeError("VIDEO_HOSTING_INTERNAL_API_KEY is not set.")


def _video_hosting_request(path, method="GET", payload=None):
    url = f"{VIDEO_HOSTING_INTERNAL_URL}{path}"

    body = None
    headers = {
        "Accept": "application/json",
        "X-Internal-Api-Key": VIDEO_HOSTING_INTERNAL_API_KEY,
    }

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(
        url,
        data=body,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw), response.status

    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8") if e.fp else ""
        try:
            return json.loads(raw), e.code
        except Exception:
            return {
                "success": False,
                "message": raw or "Video hosting request failed.",
            }, e.code

    except Exception as e:
        return {
            "success": False,
            "message": f"Could not connect to video hosting server: {e}",
        }, 502


@app.route("/api/admin/video-hosting/videos", methods=["GET"])
@admin_required
def admin_video_hosting_videos():
    params = {}

    search_query = (request.args.get("search") or "").strip()
    folder_id = (request.args.get("folder_id") or "").strip()

    if search_query:
        params["search"] = search_query

    if folder_id:
        params["folder_id"] = folder_id

    query = f"?{urlencode(params)}" if params else ""

    data, status = _video_hosting_request(f"/api/internal/videos{query}")

    return jsonify(data), status

@app.route("/api/admin/video-hosting/folders", methods=["GET"])
@admin_required
def admin_video_hosting_folders():
    params = {}

    parent_id = (request.args.get("parent_id") or "").strip()
    mode = (request.args.get("mode") or "").strip()

    if parent_id:
        params["parent_id"] = parent_id

    if mode:
        params["mode"] = mode

    query = f"?{urlencode(params)}" if params else ""

    data, status = _video_hosting_request(f"/api/internal/folders{query}")

    return jsonify(data), status

@app.route("/api/admin/video-hosting/watch-link/<video_id>", methods=["POST"])
@admin_required
def admin_video_hosting_watch_link(video_id):
    data = request.get_json(silent=True) or {}

    payload = {
        "ttl": data.get("ttl", 86400),
    }

    response_data, status = _video_hosting_request(
        f"/api/internal/watch-link/{video_id}",
        method="POST",
        payload=payload,
    )

    return jsonify(response_data), status


@app.route("/api/admin/video-hosting/videos/<video_id>", methods=["PUT"])
@admin_required
def admin_video_hosting_update_video(video_id):
    data = request.get_json(silent=True) or {}

    payload = {
        "title": data.get("title"),
        "description": data.get("description"),
        "tags": data.get("tags"),
        "visibility": data.get("visibility"),
    }

    response_data, status = _video_hosting_request(
        f"/api/internal/videos/{video_id}",
        method="PUT",
        payload=payload,
    )

    return jsonify(response_data), status


@app.route("/api/admin/video-hosting/videos/<video_id>/move", methods=["POST"])
@admin_required
def admin_video_hosting_move_video(video_id):
    data = request.get_json(silent=True) or {}

    payload = {
        "folder_id": data.get("folder_id"),
    }

    response_data, status = _video_hosting_request(
        f"/api/internal/videos/{video_id}/move",
        method="POST",
        payload=payload,
    )

    return jsonify(response_data), status


@app.route("/api/admin/video-hosting/videos/<video_id>/retry", methods=["POST"])
@admin_required
def admin_video_hosting_retry_video(video_id):
    response_data, status = _video_hosting_request(
        f"/api/internal/videos/{video_id}/retry",
        method="POST",
        payload={},
    )

    return jsonify(response_data), status


@app.route("/api/admin/video-hosting/videos/<video_id>/cancel", methods=["POST"])
@admin_required
def admin_video_hosting_cancel_video(video_id):
    response_data, status = _video_hosting_request(
        f"/api/internal/videos/{video_id}/cancel",
        method="POST",
        payload={},
    )

    return jsonify(response_data), status


@app.route("/api/admin/video-hosting/videos/<video_id>", methods=["DELETE"])
@admin_required
def admin_video_hosting_delete_video(video_id):
    response_data, status = _video_hosting_request(
        f"/api/internal/videos/{video_id}",
        method="DELETE",
    )

    return jsonify(response_data), status



@app.route("/api/csrf-token", methods=["GET"])
def api_csrf_token():
    return jsonify({
        "csrf_token": generate_csrf()
    })















# --- Context Processors --


# --- Main Application Routes ---


@app.route("/api/admin/browse-feed/rebuild", methods=["POST"])

@csrf.exempt
def api_rebuild_browse_feed():
    if session.get("user_role") != "admin":
        return jsonify({
            "success": False,
            "error": "Unauthorized"
        }), 403

    movie_feed = rebuild_browse_feed("movie")
    series_feed = rebuild_browse_feed("series")

    return jsonify({
        "success": True,
        "message": "Browse feeds rebuilt.",
        "movie": {
            "built_at": movie_feed.get("built_at"),
            "rows": len(movie_feed.get("carousel_rows", []))
        },
        "series": {
            "built_at": series_feed.get("built_at"),
            "rows": len(series_feed.get("carousel_rows", []))
        }
    })






@app.route("/api/admin/home-feed/rebuild", methods=["POST"])
@csrf.exempt
def api_rebuild_home_feed():
    if session.get("user_role") != "admin":
        return jsonify({
            "success": False,
            "error": "Unauthorized"
        }), 403

    feed = rebuild_homepage_feed()

    return jsonify({
        "success": True,
        "message": "Homepage feed rebuilt.",
        "built_at": feed.get("built_at"),
        "rows": len(feed.get("carousel_rows", []))
    })







# direct video play route







@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    form = MyBaseForm()
    if request.method == 'POST':
        submitted_username = request.form['username']
        submitted_password = request.form['password']
        if submitted_username == ADMIN_USERNAME and check_password_hash(ADMIN_PASSWORD_HASH, submitted_password):
            session['admin'] = True
            admin_user = User.query.filter_by(username=ADMIN_USERNAME).first()
            if admin_user: session['user_id'] = admin_user.id
            flash('Admin login successful!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid credentials', 'error')
            return redirect(url_for('admin_login'))
    return render_template('admin_login.html', form=form)

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin', None)
    flash("You have been successfully logged out from admin panel.", "success")
    return redirect(url_for('index'))

@app.route('/admin/dashboard_view-flixhd-3cr3t_0x3e_dashboard_backend-admin_lxpsrwTHcIer74H-net')
@nocache
@admin_required
def admin_dashboard():
    form = MyBaseForm()
    return render_template('admin_dashboard.html', form=form)



@app.route('/admin/add_content', methods=['POST'])
@nocache
@csrf.exempt
@admin_required
def add_content():
    def normalize_episode_payload(episode_data, season_title='Season'):
        try:
            episode_number = int(episode_data.get('number') or 1)
        except (TypeError, ValueError):
            return None, 'Episode number must be a valid number.'

        episode_title = (episode_data.get('title') or '').strip()
        embed_code = (episode_data.get('embed_code') or '').strip()

        video_source_type = (
            episode_data.get('video_source_type') or 'iframe'
        ).strip().lower()

        hosted_video_id = (
            episode_data.get('hosted_video_id') or ''
        ).strip()

        if video_source_type not in ['iframe', 'hosted']:
            video_source_type = 'iframe'

        if video_source_type == 'iframe' and not embed_code:
            return None, f'Embed code is required for {season_title}, episode {episode_number}.'

        if video_source_type == 'hosted' and not hosted_video_id:
            return None, f'Hosted video ID is required for {season_title}, episode {episode_number}.'

        return {
            'number': episode_number,
            'title': episode_title or f'Episode {episode_number}',
            'embed_code': embed_code or None,
            'video_source_type': video_source_type,
            'hosted_video_id': hosted_video_id if video_source_type == 'hosted' else None,
        }, None

    if request.is_json:
        data = request.get_json(silent=True) or {}

        series_title = (data.get('title') or '').strip()

        if not series_title:
            return jsonify({
                'success': False,
                'message': 'Series title is required.'
            }), 400

        new_series = Series(
            id=str(uuid.uuid4()),
            tmdb_id=data.get('tmdb_id'),
            title=series_title,
            description=data.get('description'),
            genre=data.get('genres'),
            rating=clean_rating(data.get('rating')),
            poster_url=data.get('poster_url'),
            backdrop_url=data.get('backdrop_url'),
            preview_url=(data.get('preview_url') or '').strip() or None,
            cast=json.dumps(data.get('actors', [])),
            director=data.get('director'),
            release_date=data.get('release_date'),
            download_url=data.get('download_url')
        )

        db.session.add(new_series)

        try:
            db.session.flush()

            for season_index, season_data in enumerate(data.get('seasons', []), start=1):
                season_title = (
                    season_data.get('title') or f'Season {season_index}'
                ).strip()

                new_season = Season(
                    title=season_title,
                    series_id=new_series.id
                )

                db.session.add(new_season)
                db.session.flush()

                for episode_data in season_data.get('episodes', []):
                    normalized_episode, episode_error = normalize_episode_payload(
                        episode_data,
                        season_title=season_title
                    )

                    if episode_error:
                        db.session.rollback()
                        return jsonify({
                            'success': False,
                            'message': episode_error
                        }), 400

                    new_episode = Episode(
                        number=normalized_episode['number'],
                        title=normalized_episode['title'],
                        embed_code=normalized_episode['embed_code'],
                        video_source_type=normalized_episode['video_source_type'],
                        hosted_video_id=normalized_episode['hosted_video_id'],
                        season_id=new_season.id
                    )

                    db.session.add(new_episode)

            db.session.commit()
            clear_home_cache()

            return jsonify({
                'success': True,
                'message': 'Series added successfully!',
                'item': new_series.to_dict()
            })

        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'Database error: {str(e)}'
            }), 500

    movie_title = (request.form.get('title') or '').strip()
    movie_embed_code = (request.form.get('movie_embed_code') or '').strip()

    video_source_type = (
        request.form.get('video_source_type') or 'iframe'
    ).strip().lower()

    hosted_video_id = (
        request.form.get('hosted_video_id') or ''
    ).strip()

    if video_source_type not in ['iframe', 'hosted']:
        video_source_type = 'iframe'

    if not movie_title:
        return jsonify({
            'success': False,
            'message': 'Movie title is required.'
        }), 400

    if video_source_type == 'iframe' and not movie_embed_code:
        return jsonify({
            'success': False,
            'message': 'Embed code is required when using iframe playback.'
        }), 400

    if video_source_type == 'hosted' and not hosted_video_id:
        return jsonify({
            'success': False,
            'message': 'Hosted video ID is required when using hosted playback.'
        }), 400

    cast_json_from_hidden = request.form.get('actors_json')

    final_cast_data = (
        cast_json_from_hidden
        if cast_json_from_hidden and cast_json_from_hidden != 'undefined'
        else json.dumps([
            {
                'name': name.strip(),
                'profile_path': None
            }
            for name in request.form.get('actors', '').split(',')
            if name.strip()
        ])
        if request.form.get('actors')
        else None
    )

    local_thumbnail_filename = None
    movie_thumbnail_file = request.files.get('thumbnail')

    if movie_thumbnail_file and allowed_file(movie_thumbnail_file.filename):
        filename = secure_filename(movie_thumbnail_file.filename)
        thumbnail_extension = os.path.splitext(filename)[1]
        local_thumbnail_filename = str(uuid.uuid4()) + thumbnail_extension

        movie_thumbnail_file.save(
            os.path.join(app.config['UPLOAD_FOLDER'], local_thumbnail_filename)
        )

    new_movie = Movie(
        id=str(uuid.uuid4()),
        tmdb_id=request.form.get('tmdb_id'),
        title=movie_title,
        description=request.form.get('description'),
        genre=request.form.get('genres'),
        rating=clean_rating(request.form.get('rating')),
        embed_code=movie_embed_code or None,
        video_source_type=video_source_type,
        hosted_video_id=hosted_video_id if video_source_type == 'hosted' else None,
        poster_url=request.form.get('poster_url') if not local_thumbnail_filename else None,
        backdrop_url=request.form.get('backdrop_url'),
        thumbnail=local_thumbnail_filename,
        preview_url=(request.form.get('preview_url') or '').strip() or None,
        cast=final_cast_data,
        director=request.form.get('director'),
        release_date=request.form.get('release_date'),
        download_url=request.form.get('download_url')
    )

    db.session.add(new_movie)

    try:
        db.session.commit()
        clear_home_cache()

        return jsonify({
            'success': True,
            'message': 'Movie added successfully!',
            'item': new_movie.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Database error: {e}'
        }), 500


@app.route('/admin/edit/series/<series_id>', methods=['GET', 'POST'])
@nocache
@csrf.exempt
@admin_required
def edit_series(series_id):
    series = Series.query.options(
        joinedload(Series.seasons).joinedload(Season.episodes)
    ).get_or_404(series_id)

    form = MyBaseForm()

    def normalize_episode_payload(episode_data, season_title='Season'):
        try:
            episode_number = int(episode_data.get('number') or 1)
        except (TypeError, ValueError):
            return None, 'Episode number must be a valid number.'

        episode_title = (episode_data.get('title') or '').strip()
        embed_code = (episode_data.get('embed_code') or '').strip()

        video_source_type = (
            episode_data.get('video_source_type') or 'iframe'
        ).strip().lower()

        hosted_video_id = (
            episode_data.get('hosted_video_id') or ''
        ).strip()

        if video_source_type not in ['iframe', 'hosted']:
            video_source_type = 'iframe'

        if video_source_type == 'iframe' and not embed_code:
            return None, f'Embed code is required for {season_title}, episode {episode_number}.'

        if video_source_type == 'hosted' and not hosted_video_id:
            return None, f'Hosted video ID is required for {season_title}, episode {episode_number}.'

        return {
            'number': episode_number,
            'title': episode_title or f'Episode {episode_number}',
            'embed_code': embed_code or None,
            'video_source_type': video_source_type,
            'hosted_video_id': hosted_video_id if video_source_type == 'hosted' else None,
        }, None

    if request.method == 'POST':
        try:
            data = request.get_json(silent=True) or {}

            series.title = (data.get('title') or '').strip()
            series.description = data.get('description')
            series.rating = clean_rating(data.get('rating'))
            series.download_url = data.get('download_url')
            series.preview_url = (data.get('preview_url') or '').strip() or None

            submitted_season_ids = {
                str(season_data.get('id'))
                for season_data in data.get('seasons', [])
                if season_data.get('id')
            }

            for existing_season in list(series.seasons):
                if str(existing_season.id) not in submitted_season_ids:
                    db.session.delete(existing_season)

            for season_index, season_data in enumerate(data.get('seasons', []), start=1):
                season_id = season_data.get('id')
                season_title = (
                    season_data.get('title') or f'Season {season_index}'
                ).strip()

                if season_id:
                    current_season = Season.query.filter_by(
                        id=season_id,
                        series_id=series.id
                    ).first()

                    if not current_season:
                        db.session.rollback()
                        return jsonify({
                            'success': False,
                            'message': 'Invalid season data.'
                        }), 400

                    current_season.title = season_title
                else:
                    current_season = Season(
                        series_id=series.id,
                        title=season_title
                    )

                    db.session.add(current_season)
                    db.session.flush()

                submitted_episode_ids = {
                    str(episode_data.get('id'))
                    for episode_data in season_data.get('episodes', [])
                    if episode_data.get('id')
                }

                for existing_episode in list(current_season.episodes):
                    if str(existing_episode.id) not in submitted_episode_ids:
                        db.session.delete(existing_episode)

                for episode_data in season_data.get('episodes', []):
                    normalized_episode, episode_error = normalize_episode_payload(
                        episode_data,
                        season_title=season_title
                    )

                    if episode_error:
                        db.session.rollback()
                        return jsonify({
                            'success': False,
                            'message': episode_error
                        }), 400

                    episode_id = episode_data.get('id')

                    if episode_id:
                        episode = Episode.query.filter_by(
                            id=episode_id,
                            season_id=current_season.id
                        ).first()

                        if not episode:
                            db.session.rollback()
                            return jsonify({
                                'success': False,
                                'message': 'Invalid episode data.'
                            }), 400

                        episode.number = normalized_episode['number']
                        episode.title = normalized_episode['title']
                        episode.embed_code = normalized_episode['embed_code']
                        episode.video_source_type = normalized_episode['video_source_type']
                        episode.hosted_video_id = normalized_episode['hosted_video_id']
                    else:
                        episode = Episode(
                            season_id=current_season.id,
                            number=normalized_episode['number'],
                            title=normalized_episode['title'],
                            embed_code=normalized_episode['embed_code'],
                            video_source_type=normalized_episode['video_source_type'],
                            hosted_video_id=normalized_episode['hosted_video_id']
                        )

                        db.session.add(episode)

            series.last_updated_at = datetime.utcnow()

            db.session.commit()
            clear_home_cache()

            return jsonify({
                'success': True,
                'message': 'Series updated successfully!',
                'redirect': url_for('admin_dashboard')
            })

        except Exception as e:
            db.session.rollback()

            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500

    return render_template('edit_series.html', series=series, form=form)








# ================= (NEW)  My-list route   =================











def tmdb_get(url, params):
    response = requests.get(
        url,
        params=params,
        timeout=15,
        headers={
            "Accept": "application/json",
            "Accept-Encoding": "identity",
            "User-Agent": "FlixHD/1.0",
        }
    )

    response.raise_for_status()

    raw_body = response.content or b""

    # Case 1: normal JSON
    if raw_body.lstrip().startswith((b"{", b"[")):
        return json.loads(raw_body.decode("utf-8-sig"))

    # Case 2: gzip bytes without Content-Encoding header
    # 16 + MAX_WBITS tells zlib to decode gzip wrapper.
    if raw_body[:2] == b"\x1f\x8b":
        try:
            decoded = zlib.decompress(raw_body, 16 + zlib.MAX_WBITS)
            return json.loads(decoded.decode("utf-8-sig"))
        except Exception as e:
            raise ValueError(f"TMDB gzip decode failed: {e}")

    # Case 3: last attempt using requests decoded text
    text_body = response.text or ""

    if text_body.lstrip().startswith(("{", "[")):
        return json.loads(text_body)

    raise ValueError(
        "TMDB returned a response that is not readable JSON."
    )


@app.route('/admin/fetch_tmdb_data')
@admin_required
def fetch_tmdb_data_route():
    api_key = app.config.get('TMDB_API_KEY')

    if not api_key:
        return jsonify({
            'error': 'TMDB API key not configured.'
        }), 500

    content_type = (request.args.get('type') or 'movie').strip().lower()
    title_query = (request.args.get('title') or '').strip()
    tmdb_id_query = (request.args.get('tmdb_id') or '').strip()

    if content_type not in ('movie', 'series'):
        content_type = 'movie'

    search_path = 'tv' if content_type == 'series' else 'movie'

    try:
        tmdb_data = None

        if tmdb_id_query:
            tmdb_data = tmdb_get(
                f"https://api.themoviedb.org/3/{search_path}/{tmdb_id_query}",
                {
                    "api_key": api_key,
                    "append_to_response": "credits"
                }
            )

        elif title_query:
            search_results = tmdb_get(
                f"https://api.themoviedb.org/3/search/{search_path}",
                {
                    "api_key": api_key,
                    "query": title_query
                }
            )

            results = search_results.get('results') or []

            if results:
                first_result_id = results[0].get('id')

                if first_result_id:
                    tmdb_data = tmdb_get(
                        f"https://api.themoviedb.org/3/{search_path}/{first_result_id}",
                        {
                            "api_key": api_key,
                            "append_to_response": "credits"
                        }
                    )

        if not tmdb_data:
            return jsonify({
                'not_found': True,
                'message': 'Content not found on TMDB.'
            })

        final_data = {}

        if content_type == 'movie':
            final_data.update({
                'title': tmdb_data.get('title') or tmdb_data.get('original_title'),
                'release_date': tmdb_data.get('release_date'),
                'director': get_tmdb_movie_director(
                    tmdb_data.get('credits', {}).get('crew', [])
                )
            })
        else:
            final_data.update({
                'title': tmdb_data.get('name') or tmdb_data.get('original_name'),
                'release_date': tmdb_data.get('first_air_date'),
                'director': ", ".join([
                    creator.get('name')
                    for creator in tmdb_data.get('created_by', [])
                    if creator.get('name')
                ])
            })

        final_data.update({
            'tmdb_id': tmdb_data.get('id'),
            'overview': tmdb_data.get('overview'),
            'rating': clean_rating(tmdb_data.get('vote_average')),
            'poster_url': (
                f"https://image.tmdb.org/t/p/w500{tmdb_data.get('poster_path')}"
                if tmdb_data.get('poster_path')
                else None
            ),
            'backdrop_url': (
                f"https://image.tmdb.org/t/p/w1280{tmdb_data.get('backdrop_path')}"
                if tmdb_data.get('backdrop_path')
                else None
            ),
            'genres': [
                genre.get('name')
                for genre in tmdb_data.get('genres', [])
                if genre.get('name')
            ],
            'actors': get_tmdb_top_actors(
                tmdb_data.get('credits', {}).get('cast', []),
                count=10
            )
        })

        return jsonify(final_data)

    except requests.exceptions.RequestException as e:
        return jsonify({
            'error': f'TMDB API request failed: {e}'
        }), 500

    except Exception as e:
        return jsonify({
            'error': f'TMDB fetch failed: {e}'
        }), 500




@app.route('/api/movie/<movie_id>', methods=['POST'])
@csrf.exempt
@admin_required
def api_edit_movie(movie_id):
    movie = Movie.query.get_or_404(movie_id)
    form_data = request.form

    video_source_type = (
        form_data.get('video_source_type')
        or getattr(movie, 'video_source_type', 'iframe')
        or 'iframe'
    ).strip().lower()

    hosted_video_id = (form_data.get('hosted_video_id') or '').strip()
    embed_code = (form_data.get('embed_code') or '').strip()

    if video_source_type not in ['iframe', 'hosted']:
        video_source_type = 'iframe'

    if video_source_type == 'iframe' and not embed_code:
        return jsonify({
            'success': False,
            'message': 'Embed code is required when using iframe playback.'
        }), 400

    if video_source_type == 'hosted' and not hosted_video_id:
        return jsonify({
            'success': False,
            'message': 'Hosted video ID is required when using hosted playback.'
        }), 400

    movie.title = form_data.get('title', movie.title)
    movie.description = form_data.get('description', movie.description)
    movie.release_date = form_data.get('release_date', movie.release_date)
    if 'rating' in form_data:
        movie.rating = clean_rating(form_data.get('rating'))
    movie.director = form_data.get('director', movie.director)
    movie.tmdb_id = form_data.get('tmdb_id', movie.tmdb_id)
    movie.genre = form_data.get('genres', movie.genre)
    movie.download_url = form_data.get('download_url', movie.download_url)
    movie.preview_url = (form_data.get('preview_url') or '').strip() or None

    # Existing iframe field now also works as fallback for hosted movies.
    movie.embed_code = embed_code

    # New playback fields.
    movie.video_source_type = video_source_type
    movie.hosted_video_id = hosted_video_id if video_source_type == 'hosted' else None

    if form_data.get('actors'):
        movie.cast = json.dumps([
            {'name': name.strip(), 'profile_path': None}
            for name in form_data.get('actors').split(',')
            if name.strip()
        ])

    thumbnail_file = request.files.get('thumbnail')

    if thumbnail_file and allowed_file(thumbnail_file.filename):
        if movie.thumbnail and os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'], movie.thumbnail)):
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], movie.thumbnail))

        new_filename = str(uuid.uuid4()) + os.path.splitext(thumbnail_file.filename)[1]
        thumbnail_file.save(os.path.join(app.config['UPLOAD_FOLDER'], new_filename))

        movie.thumbnail = new_filename
        movie.poster_url = None

    elif 'poster_url' in form_data:
        movie.poster_url = form_data.get('poster_url')

    try:
        db.session.commit()
        clear_home_cache()

        return jsonify({
            'success': True,
            'message': 'Movie updated successfully!',
            'item': movie.to_dict()
        })

    except Exception as e:
        db.session.rollback()

        return jsonify({
            'success': False,
            'message': f'Failed to update movie: {e}'
        }), 500

@app.route('/delete/movie/<movie_id>', methods=['DELETE'])
@csrf.exempt
@admin_required
def delete_movie(movie_id):
    movie = Movie.query.get_or_404(movie_id)
    if movie.thumbnail:
        thumbnail_path = os.path.join(app.config['UPLOAD_FOLDER'], movie.thumbnail)
        if os.path.exists(thumbnail_path): os.remove(thumbnail_path)
    db.session.delete(movie)
    db.session.commit()
    clear_home_cache()
    return jsonify({'success': True, 'message': 'Movie deleted successfully!'})

@app.route('/delete/series/<series_id>', methods=['DELETE'])
@csrf.exempt
@admin_required
def delete_series(series_id):
    series = Series.query.get_or_404(series_id)
    if series.thumbnail:
        thumbnail_path = os.path.join(app.config['UPLOAD_FOLDER'], series.thumbnail)
        if os.path.exists(thumbnail_path): os.remove(thumbnail_path)
    db.session.delete(series)
    db.session.commit()
    clear_home_cache()
    return jsonify({'success': True, 'message': 'Series deleted successfully!'})


@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_get_users():
    page = request.args.get('page', 1, type=int)
    search_query = (request.args.get('search') or '').strip()
    per_page = request.args.get('per_page', app.config.get('PER_PAGE', 20), type=int)

    if page < 1:
        page = 1

    if per_page < 1 or per_page > 100:
        per_page = app.config.get('PER_PAGE', 20)

    users_query = User.query

    if search_query:
        search_like = f"%{search_query}%"
        lowered = search_query.lower()

        filters = [
            User.username.ilike(search_like),
            User.email.ilike(search_like),
            User.display_name.ilike(search_like),
            User.role.ilike(search_like),
            User.auth_provider.ilike(search_like),
            cast(User.id, String).ilike(search_like),
        ]

        if lowered in ["active", "enabled"]:
            filters.append(User.is_active.is_(True))

        if lowered in ["inactive", "suspended", "disabled", "blocked"]:
            filters.append(User.is_active.is_(False))

        if lowered in ["google"]:
            filters.append(User.auth_provider == "google")

        if lowered in ["local"]:
            filters.append(User.auth_provider == "local")

        users_query = users_query.filter(or_(*filters))

    users_query = users_query.order_by(User.id.desc())

    users = users_query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )

    user_ids = [u.id for u in users.items]
    last_seen_map = {}

    if user_ids:
        conn = get_db_connection()
        try:
            cur = conn.cursor()

            placeholders = ",".join(["%s"] * len(user_ids))

            cur.execute(
                f"""
                SELECT user_id, MAX(last_seen_at) AS last_seen_at
                FROM analytics_sessions
                WHERE user_id IN ({placeholders})
                GROUP BY user_id
                """,
                tuple(user_ids)
            )

            for uid, last_seen in cur.fetchall():
                last_seen_map[int(uid)] = last_seen.isoformat() if last_seen else None
        finally:
            conn.close()

    payload_users = []

    for u in users.items:
        ud = u.to_dict()

        ud["last_seen_at"] = last_seen_map.get(u.id)
        ud["movie_requests_count"] = MovieRequest.query.filter_by(user_id=u.id).count()
        ud["notifications_count"] = Notification.query.filter_by(user_id=u.id).count()
        ud["my_list_count"] = UserList.query.filter_by(user_id=u.id).count()

        payload_users.append(ud)

    return jsonify({
        "success": True,
        "users": payload_users,
        "items": payload_users,
        "total_users": users.total,
        "total_items": users.total,
        "pages": users.pages,
        "current_page": users.page,
        "page": users.page,
        "has_next": users.has_next,
        "next_num": users.next_num,
        "next_page_number": users.next_num if users.has_next else None,
    })


@app.route('/api/admin/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
@csrf.exempt
@admin_required
def admin_manage_user(user_id):
    user = User.query.get_or_404(user_id)

    current_admin_id = (
        session.get("admin_user_id")
        or session.get("admin_id")
        or session.get("user_id")
    )

    if request.method == 'GET':
        user_data = user.to_dict(include_sensitive=True)

        user_data["movie_requests_count"] = MovieRequest.query.filter_by(user_id=user.id).count()
        user_data["notifications_count"] = Notification.query.filter_by(user_id=user.id).count()
        user_data["my_list_count"] = UserList.query.filter_by(user_id=user.id).count()

        user_data["recent_requests"] = [
            request_item.to_dict()
            for request_item in MovieRequest.query
            .filter_by(user_id=user.id)
            .order_by(MovieRequest.id.desc())
            .limit(10)
            .all()
        ]

        user_data["recent_notifications"] = [
            notification.to_dict()
            for notification in Notification.query
            .filter_by(user_id=user.id)
            .order_by(Notification.id.desc())
            .limit(10)
            .all()
        ]

        return jsonify({
            "success": True,
            "user": user_data,
            "item": user_data,
        })

    if request.method == 'PUT':
        data = request.get_json(silent=True) or {}

        if current_admin_id and int(current_admin_id) == int(user.id):
            if "role" in data and data.get("role") != user.role:
                return jsonify({
                    "success": False,
                    "message": "You cannot change your own role from the admin dashboard."
                }), 400

            if "is_active" in data and bool(data.get("is_active")) is False:
                return jsonify({
                    "success": False,
                    "message": "You cannot suspend your own admin account."
                }), 400

        if 'username' in data:
            new_username = (data.get('username') or '').strip()

            if not new_username:
                return jsonify({
                    "success": False,
                    "message": "Username cannot be empty."
                }), 400

            user.username = new_username

        if 'email' in data:
            new_email = (data.get('email') or '').strip().lower()

            if not new_email:
                return jsonify({
                    "success": False,
                    "message": "Email cannot be empty."
                }), 400

            user.email = new_email

        if 'role' in data:
            new_role = (data.get('role') or '').strip().lower()

            if new_role not in ['user', 'admin']:
                return jsonify({
                    "success": False,
                    "message": "Invalid role."
                }), 400

            user.role = new_role

        if 'is_active' in data:
            user.is_active = bool(data.get('is_active'))

        if 'password' in data and data.get('password'):
            user.password = generate_password_hash(data.get('password'))
            user.password_changed_at = datetime.utcnow()

        try:
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'User updated successfully.',
                'user': user.to_dict(),
                'item': user.to_dict(),
            })

        except IntegrityError:
            db.session.rollback()

            return jsonify({
                'success': False,
                'message': 'Username or email already exists.'
            }), 409

        except Exception as e:
            db.session.rollback()

            return jsonify({
                'success': False,
                'message': f'Could not update user: {e}'
            }), 500

    if request.method == 'DELETE':
        if current_admin_id and int(current_admin_id) == int(user.id):
            return jsonify({
                'success': False,
                'message': 'Cannot delete your own account.'
            }), 403

        try:
            username = user.username
            user_email = user.email

            pending_user = PendingUser.query.filter_by(email=user_email).first()

            if pending_user:
                db.session.delete(pending_user)

            MovieRequest.query.filter_by(user_id=user.id).update(
                {"user_id": None},
                synchronize_session=False
            )

            Notification.query.filter_by(user_id=user.id).delete(
                synchronize_session=False
            )

            UserList.query.filter_by(user_id=user.id).delete(
                synchronize_session=False
            )

            db.session.delete(user)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': f'User {username} deleted successfully.',
                'deleted_user_id': user_id,
            })

        except Exception as e:
            db.session.rollback()

            return jsonify({
                'success': False,
                'message': f'Could not delete user: {e}'
            }), 500



@app.route('/request', methods=['GET', 'POST'])
def request_page():
    form = MyBaseForm()

    if request.method == 'POST':
        title = (request.form.get('title') or '').strip()
        link = (request.form.get('link') or '').strip()
        notes = (request.form.get('notes') or '').strip()

        if not title:
            flash('Title required.', 'error')
            return render_template(
                'request.html',
                form=form,
                title=title,
                link=link,
                notes=notes
            )

        new_request = MovieRequest(
            user_id=session.get('user_id'),
            title=title,
            link=link,
            notes=notes
        )

        try:
            db.session.add(new_request)
            db.session.commit()
            flash('Request submitted!', 'success')
        except Exception as e:
            db.session.rollback()
            flash(f'Error: {e}', 'error')

        return redirect(url_for('request_page'))

    return render_template('request.html', form=form)


@app.route('/request/submit', methods=['POST'])
def submit_request():
    title = (request.form.get('movie-title') or '').strip()
    link = (request.form.get('movie-link') or '').strip()
    notes = (request.form.get('notes') or '').strip()
    request_type = (request.form.get('request-type') or '').strip()

    if not title:
        flash('Title required.', 'error')
        return redirect(url_for('request_page'))

    final_notes = notes
    if request_type:
        final_notes = f"Type: {request_type}\n\n{notes}" if notes else f"Type: {request_type}"

    new_request = MovieRequest(
        user_id=session.get('user_id'),
        title=title,
        link=link,
        notes=final_notes
    )

    try:
        db.session.add(new_request)
        db.session.commit()
        flash('Request submitted!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error: {e}', 'error')

    return redirect(url_for('request_page'))





@app.route('/api/admin/requests/<int:request_id>/complete', methods=['POST'])
@csrf.exempt
@admin_required
def api_admin_complete_request(request_id):
    req = MovieRequest.query.get_or_404(request_id)
    req.status = 'Completed'

    db.session.commit()

    return jsonify({
        'success': True,
        'updated_request': req.to_dict()
    })


@app.route('/api/admin/requests/<int:request_id>/delete', methods=['POST'])
@csrf.exempt
@admin_required
def api_admin_delete_request(request_id):
    req = MovieRequest.query.get_or_404(request_id)

    db.session.delete(req)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Request deleted!'
    })

@app.route('/contact', methods=['GET', 'POST'])
@nocache
def contact():
    form = MyBaseForm()
    if request.method == 'POST':
        name, email, message = request.form.get('name'), request.form.get('email'), request.form.get('message')
        if not all([name, email, message]):
            flash('All fields required.', 'error')
            return render_template('contact.html', form=form, name=name, email=email, subject=request.form.get('subject'), message_content=message)
        db.session.add(ContactMessage(name=name, email=email, subject=request.form.get('subject'), message=message))
        db.session.commit()
        flash('Message sent!', 'success')
        return redirect(url_for('contact'))
    return render_template('contact.html', form=form)



@app.route('/api/admin/messages', methods=['GET'])
@admin_required
def admin_get_messages():
    page = request.args.get('page', 1, type=int)
    search_query = (request.args.get('search') or '').strip()
    status_filter = (request.args.get('status') or '').strip()
    per_page = request.args.get('per_page', 20, type=int)

    if page < 1:
        page = 1

    if per_page < 1 or per_page > 100:
        per_page = 20

    query = ContactMessage.query

    if search_query:
        search_like = f"%{search_query}%"

        query = query.filter(
            or_(
                ContactMessage.name.ilike(search_like),
                ContactMessage.email.ilike(search_like),
                ContactMessage.subject.ilike(search_like),
                ContactMessage.message.ilike(search_like),
                ContactMessage.status.ilike(search_like),
                cast(ContactMessage.id, String).ilike(search_like),
            )
        )

    if status_filter:
        query = query.filter(ContactMessage.status.ilike(status_filter))

    query = query.order_by(ContactMessage.date.desc())

    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )

    items = [message.to_dict() for message in pagination.items]

    return jsonify({
        "success": True,
        "items": items,
        "messages": items,
        "total_items": pagination.total,
        "total_messages": pagination.total,
        "page": pagination.page,
        "current_page": pagination.page,
        "has_next": pagination.has_next,
        "next_page_number": pagination.next_num if pagination.has_next else None,
        "next_num": pagination.next_num if pagination.has_next else None,
    })


@app.route('/api/admin/messages/<int:message_id>', methods=['GET'])
@admin_required
def admin_get_message_detail(message_id):
    message = ContactMessage.query.get_or_404(message_id)

    return jsonify({
        "success": True,
        "item": message.to_dict(),
        "message": message.to_dict(),
    })


@app.route('/api/admin/messages/mark_read/<int:message_id>', methods=['POST'])
@csrf.exempt
@admin_required
def admin_mark_message_read(message_id):
    message = ContactMessage.query.get_or_404(message_id)

    message.status = 'Read'

    try:
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Message marked as read.',
            'updated_message': message.to_dict(),
            'item': message.to_dict(),
        })

    except Exception as e:
        db.session.rollback()

        return jsonify({
            'success': False,
            'message': f'Could not mark message as read: {e}'
        }), 500


@app.route('/api/admin/messages/mark_new/<int:message_id>', methods=['POST'])
@csrf.exempt
@admin_required
def admin_mark_message_new(message_id):
    message = ContactMessage.query.get_or_404(message_id)

    message.status = 'New'

    try:
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Message marked as new.',
            'updated_message': message.to_dict(),
            'item': message.to_dict(),
        })

    except Exception as e:
        db.session.rollback()

        return jsonify({
            'success': False,
            'message': f'Could not mark message as new: {e}'
        }), 500


@app.route('/api/admin/messages/delete/<int:message_id>', methods=['DELETE'])
@csrf.exempt
@admin_required
def admin_delete_message(message_id):
    message = ContactMessage.query.get_or_404(message_id)

    try:
        db.session.delete(message)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Message deleted successfully.',
            'deleted_message_id': message_id,
        })

    except Exception as e:
        db.session.rollback()

        return jsonify({
            'success': False,
            'message': f'Could not delete message: {e}'
        }), 500
    



@app.route('/api/admin/pending_users', methods=['GET'])
@admin_required
def admin_get_pending_users():
    page = request.args.get('page', 1, type=int)
    search_query = (request.args.get('search') or '').strip()
    per_page = request.args.get('per_page', 20, type=int)

    if page < 1:
        page = 1

    if per_page < 1 or per_page > 100:
        per_page = 20

    query = PendingUser.query

    if search_query:
        search_like = f"%{search_query}%"

        query = query.filter(
            or_(
                PendingUser.username.ilike(search_like),
                PendingUser.email.ilike(search_like),
                PendingUser.otp.ilike(search_like),
                cast(PendingUser.id, String).ilike(search_like),
            )
        )

    query = query.order_by(PendingUser.created_at.desc())

    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )

    items = []

    now = datetime.utcnow()
    otp_expiration_minutes = app.config.get('OTP_EXPIRATION_MINUTES', 10)

    for pending_user in pagination.items:
        data = pending_user.to_dict()

        age_seconds = 0
        expires_at = None
        is_expired = False

        if pending_user.created_at:
            age_seconds = int((now - pending_user.created_at).total_seconds())
            expires_at_dt = pending_user.created_at + timedelta(
                minutes=otp_expiration_minutes
            )
            expires_at = expires_at_dt.isoformat()
            is_expired = now > expires_at_dt

        data.update({
            "age_seconds": age_seconds,
            "expires_at": expires_at,
            "is_expired": is_expired,
        })

        items.append(data)

    return jsonify({
        "success": True,
        "items": items,
        "pending_users": items,
        "total_items": pagination.total,
        "total_pending_users": pagination.total,
        "page": pagination.page,
        "current_page": pagination.page,
        "has_next": pagination.has_next,
        "next_page_number": pagination.next_num if pagination.has_next else None,
        "next_num": pagination.next_num if pagination.has_next else None,
    })


@app.route('/api/admin/pending_users/approve/<int:pending_user_id>', methods=['POST'])
@csrf.exempt
@admin_required
def admin_approve_pending_user(pending_user_id):
    pending = PendingUser.query.get_or_404(pending_user_id)

    if User.query.filter_by(email=pending.email).first():
        return jsonify({
            'success': False,
            'message': 'A user with this email already exists.'
        }), 409

    if User.query.filter_by(username=pending.username).first():
        return jsonify({
            'success': False,
            'message': 'A user with this username already exists.'
        }), 409

    try:
        new_user = User(
            username=pending.username,
            email=pending.email,
            password=pending.password,
            is_active=True
        )

        db.session.add(new_user)
        db.session.delete(pending)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Pending user verified successfully.',
            'user': new_user.to_dict(),
            'approved_pending_user_id': pending_user_id,
        })

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            'success': False,
            'message': 'Username or email already exists.'
        }), 409

    except Exception as e:
        db.session.rollback()

        return jsonify({
            'success': False,
            'message': f'Could not verify pending user: {e}'
        }), 500


@app.route('/api/admin/pending_users/delete/<int:pending_user_id>', methods=['DELETE'])
@csrf.exempt
@admin_required
def admin_delete_pending_user(pending_user_id):
    pending = PendingUser.query.get_or_404(pending_user_id)

    try:
        db.session.delete(pending)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Pending user deleted successfully.',
            'deleted_pending_user_id': pending_user_id,
        })

    except Exception as e:
        db.session.rollback()

        return jsonify({
            'success': False,
            'message': f'Could not delete pending user: {e}'
        }), 500

# --- Notification Routes ---


@app.route('/api/admin/send_notification', methods=['POST'])
@csrf.exempt
@admin_required
def admin_send_notification():
    data = request.get_json(silent=True) or {}

    recipient_type = (data.get('recipient_type') or 'all').strip().lower()
    target_user_id = data.get('user_id')
    title = (data.get('title') or '').strip()
    message = (data.get('message') or '').strip()
    notif_type = (data.get('type') or 'info').strip().lower()
    image_url = (data.get('image_url') or '').strip() or None

    if not title or not message:
        return jsonify({
            'success': False,
            'message': 'Title and message are required.'
        }), 400

    if notif_type not in ['info', 'success', 'warning', 'error']:
        notif_type = 'info'

    try:
        if recipient_type == 'all':
            users = User.query.all()

        elif recipient_type == 'active':
            users = User.query.filter_by(is_active=True).all()

        elif recipient_type == 'single':
            if not target_user_id:
                return jsonify({
                    'success': False,
                    'message': 'User ID is required for single-user notification.'
                }), 400

            user = User.query.get(target_user_id)
            users = [user] if user else []

        else:
            return jsonify({
                'success': False,
                'message': 'Invalid recipient type.'
            }), 400

        if not users:
            return jsonify({
                'success': False,
                'message': 'No matching users found.'
            }), 404

        sent_at = datetime.utcnow()

        for user in users:
            db.session.add(Notification(
                user_id=user.id,
                title=title,
                message=message,
                type=notif_type,
                image_url=image_url,
                created_at=sent_at
            ))

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Notification sent to {len(users)} user(s).',
            'sent_count': len(users)
        })

    except Exception as e:
        db.session.rollback()

        return jsonify({
            'success': False,
            'message': f'Failed to send notification: {e}'
        }), 500


def _admin_notification_time_ago(created_at):
    if not created_at:
        return None

    now = datetime.utcnow()
    diff = now - created_at

    if diff.days > 0:
        return f"{diff.days}d ago"

    if diff.seconds > 3600:
        return f"{diff.seconds // 3600}h ago"

    if diff.seconds > 60:
        return f"{diff.seconds // 60}m ago"

    return "Just now"


@app.route('/api/admin/notifications', methods=['GET'])
@admin_required
def admin_get_notifications():
    page = request.args.get('page', 1, type=int)
    search_query = (request.args.get('search') or '').strip()
    per_page = request.args.get('per_page', 20, type=int)

    if page < 1:
        page = 1

    if per_page < 1 or per_page > 100:
        per_page = 20

    created_second = func.date_format(
        Notification.created_at,
        '%Y-%m-%d %H:%i:%s'
    )

    query = db.session.query(
        func.max(Notification.id).label('id'),
        func.count(Notification.id).label('recipient_count'),
        func.min(Notification.user_id).label('first_user_id'),
        Notification.title.label('title'),
        Notification.message.label('message'),
        Notification.type.label('type'),
        Notification.image_url.label('image_url'),
        func.max(Notification.is_read).label('is_read'),
        func.max(Notification.created_at).label('created_at'),
        created_second.label('created_second')
    ).outerjoin(
        User,
        Notification.user_id == User.id
    )

    if search_query:
        search_like = f"%{search_query}%"

        query = query.filter(
            or_(
                Notification.title.ilike(search_like),
                Notification.message.ilike(search_like),
                Notification.type.ilike(search_like),
                User.username.ilike(search_like),
                User.email.ilike(search_like),
                cast(Notification.id, String).ilike(search_like),
                cast(Notification.user_id, String).ilike(search_like),
            )
        )

    query = query.group_by(
        Notification.title,
        Notification.message,
        Notification.type,
        Notification.image_url,
        created_second
    ).order_by(
        func.max(Notification.id).desc()
    )

    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )

    items = []

    for row in pagination.items:
        recipient_count = int(row.recipient_count or 0)

        user = None
        if recipient_count == 1 and row.first_user_id:
            user = User.query.get(row.first_user_id)

        items.append({
            'id': row.id,
            'notification_group_id': row.id,
            'recipient_count': recipient_count,
            'is_grouped': recipient_count > 1,

            'user_id': row.first_user_id if recipient_count == 1 else None,
            'username': user.username if user else None,
            'user_email': user.email if user else None,

            'title': row.title,
            'message': row.message,
            'type': row.type or 'info',
            'image_url': row.image_url,
            'is_read': bool(row.is_read),
            'created_at': row.created_at.strftime("%Y-%m-%d %H:%M") if row.created_at else None,
            'time_ago': _admin_notification_time_ago(row.created_at),
        })

    return jsonify({
        'success': True,
        'items': items,
        'total_items': pagination.total,
        'page': pagination.page,
        'has_next': pagination.has_next,
        'next_page_number': pagination.next_num if pagination.has_next else None,
    })


@app.route('/api/admin/notifications/<int:notification_id>', methods=['DELETE'])
@csrf.exempt
@admin_required
def admin_delete_notification(notification_id):
    notification = Notification.query.get_or_404(notification_id)

    try:
        created_start = notification.created_at.replace(microsecond=0)
        created_end = created_start + timedelta(seconds=1)

        delete_query = Notification.query.filter(
            Notification.title == notification.title,
            Notification.message == notification.message,
            Notification.type == notification.type,
            Notification.image_url == notification.image_url,
            Notification.created_at >= created_start,
            Notification.created_at < created_end,
        )

        deleted_count = delete_query.delete(synchronize_session=False)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Notification deleted successfully from {deleted_count} user(s).',
            'deleted_notification_id': notification_id,
            'deleted_count': deleted_count,
        })

    except Exception as e:
        db.session.rollback()

        return jsonify({
            'success': False,
            'message': f'Could not delete notification: {e}'
        }), 500






@csrf.exempt  # Exempt from CSRF since it's an API endpoint (ensure you have other protections in place)
@app.post("/api/analytics/track")
def analytics_track():
    

    payload = request.get_json(silent=True) or {}
    session_id = (payload.get("session_id") or "").strip()
    events = payload.get("events") or []
    if not session_id or not isinstance(events, list) or len(events) == 0:
        return jsonify({"ok": False, "error": "invalid_payload"}), 400

    # Identify user if logged in (adapt to your auth)
    user_id = session.get("user_id")  # or current_user.id if using Flask-Login
    guest_id = payload.get("guest_id")  # optional; can be set by frontend

    ua = request.headers.get("User-Agent", "")
    ip = request.headers.get("CF-Connecting-IP") or request.headers.get("X-Forwarded-For") or request.remote_addr
    device_type = get_device_type(ua)

    # Use server time as fallback
    now_ms = int(time.time() * 1000)

    # Normalize events
    rows = []
    last_event_ms = None
    pageviews_inc = 0
    watch_time_inc = 0

    for e in events[:200]:  # safety cap per request
        try:
            ts_ms = int(e.get("ts") or now_ms)
        except Exception:
            ts_ms = now_ms
        if last_event_ms is None or ts_ms > last_event_ms:
            last_event_ms = ts_ms

        event_name = (e.get("event_name") or "").strip()[:64]
        if not event_name:
            continue

        path = (e.get("path") or "")[:255] or None
        referrer = (e.get("referrer") or "")[:255] or None

        props = e.get("properties") or {}
        # Keep JSON small
        if isinstance(props, dict):
            props_str = json.dumps(props, ensure_ascii=False)[:8000]
        else:
            props_str = json.dumps({"value": str(props)})[:8000]

        if event_name == "page_view":
            pageviews_inc += 1

        # Playback progress can increment watch time (client sends delta)
        if event_name == "play_progress":
            try:
                watch_time_inc += int(props.get("delta") or 0)
            except Exception:
                pass

        rows.append((utc_dt_ms(ts_ms), session_id, user_id, event_name, path, referrer, props_str))

    if not rows:
        return jsonify({"ok": True, "ignored": True})

    last_seen_ms = last_event_ms or now_ms
    started_at = utc_dt_ms(rows[0][0] and int((datetime.strptime(rows[0][0], '%Y-%m-%d %H:%M:%S.%f')
                                              .replace(tzinfo=timezone.utc).timestamp()) * 1000) or now_ms)

    conn = get_db_connection()  # your existing PyMySQL connection factory
    try:
        with conn.cursor() as cur:
            # Upsert session summary
            cur.execute("""
                INSERT INTO analytics_sessions
                  (session_id, user_id, guest_id, started_at, last_seen_at, pageviews, events_count,
                   watch_time_seconds, device_type, user_agent, ip)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                  user_id = COALESCE(VALUES(user_id), user_id),
                  guest_id = COALESCE(VALUES(guest_id), guest_id),
                  last_seen_at = GREATEST(last_seen_at, VALUES(last_seen_at)),
                  pageviews = pageviews + VALUES(pageviews),
                  events_count = events_count + VALUES(events_count),
                  watch_time_seconds = watch_time_seconds + VALUES(watch_time_seconds),
                  device_type = device_type,
                  user_agent = user_agent,
                  ip = ip
            """, (session_id, user_id, guest_id, utc_dt_ms(now_ms), utc_dt_ms(last_seen_ms),
                  pageviews_inc, len(rows), watch_time_inc, device_type, ua, ip))

            # Bulk insert events
            cur.executemany("""
                INSERT INTO analytics_events (ts, session_id, user_id, event_name, path, referrer, properties)
                VALUES (%s, %s, %s, %s, %s, %s, CAST(%s AS JSON))
            """, rows)

        conn.commit()
    except Exception as ex:
        conn.rollback()
        return jsonify({"ok": False, "error": "db_error"}), 500
    finally:
        conn.close()

    return jsonify({"ok": True, "inserted": len(rows)})










@app.route('/api/admin/pages', methods=['GET'])
@nocache
@admin_required
def admin_get_pages():
    pages = Page.query.order_by(Page.is_system.desc(), Page.title.asc()).all()
    return jsonify([p.to_dict() for p in pages])


@app.route('/api/admin/pages/<int:page_id>', methods=['GET', 'PUT'])
@nocache
@admin_required
def admin_manage_page(page_id):
    page = Page.query.get_or_404(page_id)

    if request.method == 'GET':
        return jsonify(page.to_dict())

    data = request.get_json(silent=True) or {}

    title = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    meta_description = (data.get('meta_description') or '').strip()

    if not title:
        return jsonify({'success': False, 'message': 'Title is required.'}), 400

    if not content:
        return jsonify({'success': False, 'message': 'Content is required.'}), 400

    page.title = title
    page.content = content
    page.meta_description = meta_description or None
    page.is_published = bool(data.get('is_published', True))
    page.show_in_footer = bool(data.get('show_in_footer', True))

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Page updated successfully.',
        'page': page.to_dict()
    })




# Admin analytics endpoint to view user sessions and events (example implementation)

@app.route('/api/admin/analytics/user/<int:user_id>/sessions', methods=['GET'])
@admin_required
def admin_analytics_user_sessions(user_id):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT session_id, started_at, last_seen_at, ended_at,
                   TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, last_seen_at)) AS duration_seconds,
                   pageviews, events_count, watch_time_seconds, device_type
            FROM analytics_sessions
            WHERE user_id = %s
            ORDER BY started_at DESC
            LIMIT 200
        """, (user_id,))
        rows = cur.fetchall()
        data = rows_to_dicts(cur, rows)
        return jsonify({"ok": True, "sessions": data})
    finally:
        conn.close()


@app.route('/api/admin/analytics/session/<session_id>/timeline', methods=['GET'])
@admin_required
def admin_analytics_session_timeline(session_id):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT ts, event_name, path, referrer, properties
            FROM analytics_events
            WHERE session_id = %s
            ORDER BY ts ASC
            LIMIT 5000
        """, (session_id,))
        rows = cur.fetchall()
        data = rows_to_dicts(cur, rows)
        return jsonify({"ok": True, "timeline": data})
    finally:
        conn.close()


@app.route('/api/admin/analytics/user/<int:user_id>/watch-summary', methods=['GET'])
@admin_required
def admin_analytics_user_watch_summary(user_id):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
              JSON_UNQUOTE(JSON_EXTRACT(properties,'$.content_id')) AS content_id,
              JSON_UNQUOTE(JSON_EXTRACT(properties,'$.content_type')) AS content_type,
              SUM(COALESCE(CAST(JSON_EXTRACT(properties,'$.delta') AS UNSIGNED),0)) AS watch_seconds,
              MAX(COALESCE(CAST(JSON_EXTRACT(properties,'$.t') AS UNSIGNED),0)) AS max_progress
            FROM analytics_events
            WHERE user_id = %s AND event_name = 'play_progress'
            GROUP BY content_type, content_id
            ORDER BY watch_seconds DESC
            LIMIT 200
        """, (user_id,))
        rows = cur.fetchall()
        data = rows_to_dicts(cur, rows)
        return jsonify({"ok": True, "watch": data})
    finally:
        conn.close()



@app.route('/api/admin/analytics/user/<int:user_id>/watchpage-summary', methods=['GET'])
@admin_required
def admin_analytics_user_watchpage_summary(user_id):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
              JSON_UNQUOTE(JSON_EXTRACT(properties,'$.content_id')) AS content_id,
              JSON_UNQUOTE(JSON_EXTRACT(properties,'$.content_type')) AS content_type,
              SUM(CASE WHEN event_name = 'watch_page_heartbeat' THEN 15 ELSE 0 END) AS approx_seconds,
              SUM(CASE WHEN event_name = 'watch_page_open' THEN 1 ELSE 0 END) AS opens
            FROM analytics_events
            WHERE user_id = %s
              AND event_name IN ('watch_page_open','watch_page_heartbeat')
            GROUP BY content_type, content_id
            ORDER BY approx_seconds DESC
            LIMIT 200
        """, (user_id,))
        rows = cur.fetchall()

        # convert tuples -> dicts (same helper you used)
        cols = [c[0] for c in cur.description]
        data = [dict(zip(cols, r)) for r in rows]

        return jsonify({"ok": True, "watch": data})
    finally:
        conn.close()


@app.route("/api/admin/analytics/overview", methods=["GET"])
@admin_required
def api_admin_analytics_overview():
    from_dt, to_dt = _parse_date_range()
    conn = get_db_connection()
    try:
        cur = conn.cursor()

        cur.execute("""
            SELECT COUNT(*) AS total_sessions
            FROM analytics_sessions
            WHERE started_at BETWEEN %s AND %s
        """, (from_dt, to_dt))
        total_sessions = cur.fetchone()[0] or 0

        cur.execute("""
            SELECT COUNT(DISTINCT user_id) AS active_users
            FROM analytics_sessions
            WHERE user_id IS NOT NULL
              AND started_at BETWEEN %s AND %s
        """, (from_dt, to_dt))
        active_users = cur.fetchone()[0] or 0

        cur.execute("""
            SELECT COALESCE(SUM(pageviews), 0) AS pageviews
            FROM analytics_sessions
            WHERE started_at BETWEEN %s AND %s
        """, (from_dt, to_dt))
        pageviews = cur.fetchone()[0] or 0

        cur.execute("""
            SELECT COALESCE(COUNT(*) * 15, 0) AS watchpage_seconds
            FROM analytics_events
            WHERE event_name = 'watch_page_heartbeat'
              AND ts BETWEEN %s AND %s
        """, (from_dt, to_dt))
        watchpage_seconds = cur.fetchone()[0] or 0

        return jsonify({
            "ok": True,
            "range": {"from": from_dt, "to": to_dt},
            "kpi": {
                "total_sessions": int(total_sessions),
                "active_users": int(active_users),
                "pageviews": int(pageviews),
                "watchpage_seconds": int(watchpage_seconds),
            }
        })
    finally:
        conn.close()


# ----------------------------
# MODERN ANALYTICS: RECENT SESSIONS
# ----------------------------
@app.route("/api/admin/analytics/recent-sessions", methods=["GET"])
@admin_required
def api_admin_analytics_recent_sessions():
    from_dt, to_dt = _parse_date_range()
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
              session_id,
              user_id,
              started_at,
              last_seen_at,
              GREATEST(
                0,
                TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, last_seen_at, started_at))
                ) AS duration_seconds,
              pageviews,
              events_count,
              watch_time_seconds,
              device_type
            FROM analytics_sessions
            WHERE started_at BETWEEN %s AND %s
            ORDER BY started_at DESC
            LIMIT 50
        """, (from_dt, to_dt))
        data = _fetch_dicts(cur)
        return jsonify({"ok": True, "range": {"from": from_dt, "to": to_dt}, "sessions": data})
    finally:
        conn.close()


# ----------------------------
# MODERN ANALYTICS: TOP USERS (by watch-page time)
# ----------------------------
@app.route("/api/admin/analytics/top-users", methods=["GET"])
@admin_required
def api_admin_analytics_top_users():
    from_dt, to_dt = _parse_date_range()
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
              e.user_id AS user_id,
              COALESCE(u.display_name, u.username, CONCAT('User #', e.user_id)) AS user_name,
              COUNT(DISTINCT e.session_id) AS sessions,
              SUM(CASE WHEN e.event_name = 'watch_page_heartbeat' THEN 15 ELSE 0 END) AS watch_page_seconds,
              SUM(CASE WHEN e.event_name = 'watch_page_open' THEN 1 ELSE 0 END) AS opens
            FROM analytics_events e
            LEFT JOIN user u ON u.id = e.user_id
            WHERE e.user_id IS NOT NULL
              AND e.event_name IN ('watch_page_open', 'watch_page_heartbeat')
              AND e.ts BETWEEN %s AND %s
            GROUP BY e.user_id, u.display_name, u.username
            ORDER BY watch_page_seconds DESC, opens DESC
            LIMIT 50
        """, (from_dt, to_dt))
        data = _fetch_dicts(cur)
        return jsonify({"ok": True, "range": {"from": from_dt, "to": to_dt}, "users": data})
    finally:
        conn.close()


# ----------------------------
# MODERN ANALYTICS: TOP CONTENT (by watch-page time)
# ----------------------------
@app.route("/api/admin/analytics/top-content", methods=["GET"])
@admin_required
def api_admin_analytics_top_content():
    from_dt, to_dt = _parse_date_range()
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
              JSON_UNQUOTE(JSON_EXTRACT(properties,'$.content_type')) AS content_type,
              JSON_UNQUOTE(JSON_EXTRACT(properties,'$.content_id')) AS content_id,
              COUNT(*) * 15 AS approx_seconds,
              COUNT(DISTINCT user_id) AS unique_users
            FROM analytics_events
            WHERE event_name = 'watch_page_heartbeat'
              AND ts BETWEEN %s AND %s
            GROUP BY content_type, content_id
            ORDER BY approx_seconds DESC
            LIMIT 50
        """, (from_dt, to_dt))
        data = _fetch_dicts(cur)
        return jsonify({"ok": True, "range": {"from": from_dt, "to": to_dt}, "content": data})
    finally:
        conn.close()

        
# Online users endpoint (based on sessions active in last 5 minutes)

@app.route("/api/admin/analytics/online", methods=["GET"])
@admin_required
def api_admin_analytics_online():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
              SUM(CASE WHEN last_seen_at >= (UTC_TIMESTAMP() - INTERVAL 5 MINUTE) THEN 1 ELSE 0 END) AS online_sessions,
              SUM(CASE WHEN user_id IS NOT NULL AND last_seen_at >= (UTC_TIMESTAMP() - INTERVAL 5 MINUTE) THEN 1 ELSE 0 END) AS online_users,
              SUM(CASE WHEN user_id IS NULL AND last_seen_at >= (UTC_TIMESTAMP() - INTERVAL 5 MINUTE) THEN 1 ELSE 0 END) AS online_guests
            FROM analytics_sessions
        """)
        row = cur.fetchone()
        return jsonify({"ok": True, "online": {
            "sessions": int(row[0] or 0),
            "users": int(row[1] or 0),
            "guests": int(row[2] or 0),
        }})
    finally:
        conn.close()


# User recent pages endpoint (last 200 page_view events for a user)
@app.route("/api/admin/analytics/user/<int:user_id>/recent-pages", methods=["GET"])
@admin_required
def api_admin_user_recent_pages(user_id):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT ts, path, referrer
            FROM analytics_events
            WHERE user_id = %s
              AND event_name = 'page_view'
            ORDER BY ts DESC
            LIMIT 200
        """, (user_id,))
        data = _fetch_dicts(cur)
        return jsonify({"ok": True, "pages": data})
    finally:
        conn.close()





@app.route("/api/admin/analytics/live-now", methods=["GET"])
@admin_required
def api_admin_analytics_live_now():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
              s.session_id,
              s.user_id,
              s.last_seen_at,
              s.device_type,
              -- last known page for this session (fast)
              (SELECT e.path
               FROM analytics_events e
               WHERE e.session_id = s.session_id
               ORDER BY e.ts DESC
               LIMIT 1) AS last_path,
              u.username,
              u.email
            FROM analytics_sessions s
            LEFT JOIN user u ON u.id = s.user_id
            WHERE s.ended_at IS NULL
              AND s.last_seen_at >= (UTC_TIMESTAMP() - INTERVAL 60 SECOND)
            ORDER BY s.last_seen_at DESC
            LIMIT 200
        """)
        data = _fetch_dicts(cur)
        return jsonify({"ok": True, "sessions": data})
    finally:
        conn.close()





@app.route("/api/admin/analytics/live-feed", methods=["GET"])
@admin_required
def api_admin_analytics_live_feed():
    limit = request.args.get("limit", 60, type=int)
    limit = max(10, min(limit, 200))
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
              e.id,
              e.ts,
              e.session_id,
              e.user_id,
              e.event_name,
              e.path,
              u.username,
              u.email
            FROM analytics_events e
            LEFT JOIN user u ON u.id = e.user_id
            ORDER BY e.ts DESC
            LIMIT %s
        """, (limit,))
        data = _fetch_dicts(cur)
        return jsonify({"ok": True, "events": data})
    finally:
        conn.close()



@app.route("/api/admin/moderation/kick-session", methods=["POST"])
@admin_required
def api_admin_kick_session():
    data = request.get_json(silent=True) or {}
    session_id = (data.get("session_id") or "").strip()
    if not session_id:
        return jsonify({"success": False, "message": "session_id required"}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE analytics_sessions
            SET ended_at = UTC_TIMESTAMP()
            WHERE session_id = %s AND ended_at IS NULL
        """, (session_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


if __name__ == '__main__':
    with app.app_context():
        
       
        if app.config.get('SQLALCHEMY_DATABASE_URI'):
            try:
                db.create_all()
                ensure_system_pages()
                print("Database ready.")
                print("System pages ensured.")
            except Exception as e:
                print(f"DB Error: {e}")

    
    with app.app_context():
        try:
            rebuild_homepage_feed()
            rebuild_browse_feed("movie")
            rebuild_browse_feed("series")
            print("Homepage and browse feeds rebuilt successfully.")
        except Exception as e:
            print("Feed rebuild failed:", e)

    app.run(
        host='0.0.0.0',
        port=5000,
        debug=os.getenv('FLASK_DEBUG', 'False').lower() in ('true', '1', 't')
    )
