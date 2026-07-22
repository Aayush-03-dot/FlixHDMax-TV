import random

from flask import jsonify, request, session
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError

from extensions import db, csrf
from models import (
    Movie,
    Series,
    Season,
    User,
    PendingUser,
    UserList,
    MovieRequest,
    ContactMessage,
    Notification,
)
from services.feed_service import (
    _get_cached_movie_genres,
    _get_cached_series_genres,
    get_browse_feed,
    get_homepage_feed,
    normalize_browse_type,
)
from services.media_service import get_profile_image_url
from services.my_list_service import _mylist_key, get_my_list_keys_for_current_user
from services.serializers import (
    parse_cast_list,
    serialize_related_item,
    serialize_movie_detail,
    serialize_series_detail,
    serialize_home_item,
    serialize_feed_item,
    attach_my_list_flag,
    attach_my_list_flags_to_rows,
)
from utils.decorators import admin_required, api_login_required, nocache




def register_api_routes(app):
    @app.route("/api/home")
    def api_home():
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "error": "Unauthorized"
            }), 401

        search_query = request.args.get("search_query", "").strip()
        category = request.args.get("category", "all").strip()

        my_list_keys = set()
        if "user_id" in session:
            rows = db.session.query(
                UserList.content_id,
                UserList.content_type
            ).filter(UserList.user_id == session["user_id"]).all()

            my_list_keys = {_mylist_key(t, cid) for (cid, t) in rows}

        

        is_search = bool(search_query)
        is_category = bool(category and category not in ("", "all"))
        is_home = not is_search and not is_category

        featured_item = None
        carousel_rows = []

        if is_home:
            newest_movie = Movie.query.order_by(db.desc(Movie.created_at)).first()
            newest_series = Series.query.order_by(db.desc(Series.last_updated_at)).first()

            candidates = [c for c in [newest_movie, newest_series] if c]

            if candidates:
                featured_item = sorted(
                    candidates,
                    key=lambda x: x.last_updated_at if isinstance(x, Series) else x.created_at,
                    reverse=True
                )[0]

        used_ids = set()

        def add_row(title, items, category_slug=None, limit=20):
            row_items = []

            for item in items:
                item_key = (item.id, "series" if isinstance(item, Series) else "movie")

                if item_key in used_ids:
                    continue

                used_ids.add(item_key)
                row_items.append(item)

                if len(row_items) >= limit:
                    break

            if row_items:
                carousel_rows.append({
                    "title": title,
                    "category": category_slug,
                    "items": [
                        serialize_home_item(item, my_list_keys)
                        for item in row_items
                    ]
                })

        if is_home or is_search:
            new_movies = Movie.query.order_by(db.desc(Movie.created_at)).limit(30).all()
            new_series = Series.query.order_by(db.desc(Series.last_updated_at)).limit(30).all()

            mixed_new = new_movies + new_series
            mixed_new.sort(
                key=lambda x: x.last_updated_at if isinstance(x, Series) else x.created_at,
                reverse=True
            )

            add_row("New Releases", mixed_new, "all")

            top_series = Series.query.order_by(db.desc(Series.last_updated_at)).limit(80).all()
            add_row("Top Series", top_series, "all-series")

            movie_genres = _get_cached_movie_genres()
            series_genres = _get_cached_series_genres()
            genre_pool = list(set(movie_genres + series_genres))
            random.shuffle(genre_pool)

            for genre in genre_pool[:12]:
                if len(carousel_rows) >= 15:
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

                add_row(f"{genre} Picks", mixed, genre)

        return jsonify({
            "featured_item": serialize_home_item(featured_item, my_list_keys),
            "carousel_rows": carousel_rows,
            "search_query": search_query,
            "category": category,
        })


    @app.route("/api/search")
    def api_search():
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "error": "Unauthorized"
            }), 401

        search_query = (
            request.args.get("search_query")
            or request.args.get("q")
            or ""
        ).strip()

        if not search_query:
            return jsonify({
                "success": True,
                "search_query": "",
                "results": [],
                "count": 0
            })

        my_list_keys = get_my_list_keys_for_current_user()

        term = f"%{search_query.lower()}%"

        movies = Movie.query.filter(
            Movie.title.ilike(term)
        ).order_by(
            Movie.created_at.desc()
        ).limit(120).all()

        series = Series.query.filter(
            Series.title.ilike(term)
        ).order_by(
            Series.last_updated_at.desc()
        ).limit(120).all()

        results = movies + series

        results.sort(
            key=lambda item: item.last_updated_at if isinstance(item, Series) else item.created_at,
            reverse=True
        )

        serialized_results = [
            attach_my_list_flag(serialize_feed_item(item), my_list_keys)
            for item in results
        ]

        return jsonify({
            "success": True,
            "search_query": search_query,
            "results": serialized_results,
            "count": len(serialized_results)
        })


    # initial page load 
    @app.route("/api/home/initial")
    def api_home_initial():
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "error": "Unauthorized"
            }), 401

        my_list_keys = get_my_list_keys_for_current_user()

        limit = int(request.args.get("limit", 2))
        limit = max(1, min(limit, 5))

        feed = get_homepage_feed()

        rows = feed["carousel_rows"][:limit]

        featured_item = feed.get("featured_item")
        if featured_item:
            featured_item = attach_my_list_flag(featured_item, my_list_keys)

        return jsonify({
            "featured_item": featured_item,
            "carousel_rows": attach_my_list_flags_to_rows(rows, my_list_keys),
            "next_offset": len(rows),
            "has_more": len(feed["carousel_rows"]) > len(rows),
            "search_query": "",
            "category": "all",
            "built_at": feed.get("built_at")
        })


    @app.route("/api/browse/initial")
    def api_browse_initial():
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "error": "Unauthorized"
            }), 401

        browse_type = normalize_browse_type(request.args.get("type", ""))

        if not browse_type:
            return jsonify({
                "success": False,
                "error": "Invalid browse type."
            }), 400

        my_list_keys = get_my_list_keys_for_current_user()

        limit = int(request.args.get("limit", 2))
        limit = max(1, min(limit, 5))

        feed = get_browse_feed(browse_type)

        rows = feed["carousel_rows"][:limit]

        featured_item = feed.get("featured_item")

        if featured_item:
            featured_item = attach_my_list_flag(featured_item, my_list_keys)

        return jsonify({
            "success": True,
            "page_title": feed.get("page_title"),
            "content_type": browse_type,
            "featured_item": featured_item,
            "carousel_rows": attach_my_list_flags_to_rows(rows, my_list_keys),
            "next_offset": len(rows),
            "has_more": len(feed["carousel_rows"]) > len(rows),
            "search_query": "",
            "category": "all-movies" if browse_type == "movie" else "all-series",
            "built_at": feed.get("built_at")
        })


    @app.route("/api/browse/rows")
    def api_browse_rows():
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "error": "Unauthorized"
            }), 401

        browse_type = normalize_browse_type(request.args.get("type", ""))

        if not browse_type:
            return jsonify({
                "success": False,
                "error": "Invalid browse type."
            }), 400

        my_list_keys = get_my_list_keys_for_current_user()

        offset = int(request.args.get("offset", 0))
        limit = int(request.args.get("limit", 3))

        offset = max(0, offset)
        limit = max(1, min(limit, 5))

        feed = get_browse_feed(browse_type)

        rows = feed["carousel_rows"][offset:offset + limit]

        next_offset = offset + len(rows)
        has_more = len(feed["carousel_rows"]) > next_offset

        return jsonify({
            "success": True,
            "page_title": feed.get("page_title"),
            "content_type": browse_type,
            "carousel_rows": attach_my_list_flags_to_rows(rows, my_list_keys),
            "next_offset": next_offset,
            "has_more": has_more,
            "built_at": feed.get("built_at")
        })

    @app.route("/api/home/rows")
    def api_home_rows():
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "error": "Unauthorized"
            }), 401
        my_list_keys = get_my_list_keys_for_current_user()

        offset = int(request.args.get("offset", 0))
        limit = int(request.args.get("limit", 3))

        offset = max(0, offset)
        limit = max(1, min(limit, 5))

        feed = get_homepage_feed()

        rows = feed["carousel_rows"][offset:offset + limit]

        next_offset = offset + len(rows)
        has_more = len(feed["carousel_rows"]) > next_offset

        return jsonify({
            "carousel_rows": attach_my_list_flags_to_rows(rows, my_list_keys),
            "next_offset": next_offset,
            "has_more": has_more,
            "built_at": feed.get("built_at")
        })
    


    @app.route('/api/movie/<movie_id>')
    @nocache
    def api_movie_detail(movie_id):
        if 'user_id' not in session:
            return jsonify({
                "success": False,
                "error": "Unauthorized"
            }), 401

        movie = Movie.query.get_or_404(movie_id)

        related_movies = []

        if movie.genre and movie.genre_list:
            related_movies = Movie.query.filter(
                Movie.genre.like(f'%{movie.genre_list[0]}%'),
                Movie.id != movie_id
            ).order_by(
                db.desc(Movie.created_at)
            ).limit(10).all()

        if not related_movies:
            related_movies = Movie.query.filter(
                Movie.id != movie_id
            ).order_by(
                db.desc(Movie.created_at)
            ).limit(10).all()

        return jsonify({
            "success": True,
            "item": serialize_movie_detail(movie),
            "cast": parse_cast_list(movie.cast),
            "director": movie.director,
            "related_items": [
                serialize_related_item(item)
                for item in related_movies
            ]
        })



    @app.route('/api/series/<series_id>')
    @nocache
    def api_series_detail(series_id):
        if 'user_id' not in session:
            return jsonify({
                "success": False,
                "error": "Unauthorized"
            }), 401

        series = Series.query.options(
            joinedload(Series.seasons).joinedload(Season.episodes)
        ).get_or_404(series_id)

        related_series = []

        if series.genre and series.genre_list:
            related_series_candidates = Series.query.filter(
                Series.genre.like(f'%{series.genre_list[0]}%'),
                Series.id != series_id
            ).limit(10).all()

            related_series = random.sample(
                related_series_candidates,
                min(len(related_series_candidates), 5)
            )

        if not related_series:
            related_series = Series.query.filter(
                Series.id != series_id
            ).order_by(
                db.desc(Series.last_updated_at)
            ).limit(5).all()

        return jsonify({
            "success": True,
            "item": serialize_series_detail(series),
            "cast": parse_cast_list(series.cast),
            "director": series.director,
            "related_items": [
                serialize_related_item(item)
                for item in related_series
            ]
        })


    @app.route('/api/me', methods=['GET'])
    @nocache
    def api_me():
        if 'user_id' not in session:
            return jsonify({'authenticated': False, 'user': None}), 200

        user = User.query.get(session['user_id'])
        if not user:
            session.clear()
            return jsonify({'authenticated': False, 'user': None}), 200

        user_data = user.to_dict()
        user_data['profile_image_url'] = get_profile_image_url(user)
        return jsonify({'authenticated': True, 'user': user_data})


    @app.route('/api/profile')
    @api_login_required
    def api_profile():
        user_id = session.get('user_id')
        user = User.query.get_or_404(user_id)

        watchlist_count = UserList.query.filter_by(user_id=user.id).count()

        request_count = 0
        try:
            request_count = MovieRequest.query.filter_by(user_id=user.id).count()
        except Exception:
            request_count = 0

        profile_img = get_profile_image_url(user)
        display_name = getattr(user, 'display_name', None) or getattr(user, 'username', '')

        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'display_name': display_name,
                'email': user.email,
                'role': user.role,
                'login_count': getattr(user, 'login_count', 0) or 0,
                'created_at': user.created_at.isoformat() if getattr(user, 'created_at', None) else None,
            },
            'profile_img': profile_img,
            'watchlist_count': watchlist_count,
            'request_count': request_count
        })


    @app.route('/api/my-list', methods=['GET'])
    @api_login_required
    def api_get_my_list():
        user_id = session['user_id']

        entries = (UserList.query
                   .filter_by(user_id=user_id)
                   .order_by(UserList.created_at.desc())
                   .all())

        movie_ids = [e.content_id for e in entries if e.content_type == 'movie']
        series_ids = [e.content_id for e in entries if e.content_type == 'series']

        movies = Movie.query.filter(Movie.id.in_(movie_ids)).all() if movie_ids else []
        series = Series.query.filter(Series.id.in_(series_ids)).all() if series_ids else []

        movie_map = {m.id: m for m in movies}
        series_map = {s.id: s for s in series}

        items = []
        for e in entries:
            obj = movie_map.get(e.content_id) if e.content_type == 'movie' else series_map.get(e.content_id)
            if not obj:
                continue

            item_data = obj.to_dict()
            item_data['content_type'] = e.content_type
            item_data['saved_at'] = e.created_at.isoformat() if e.created_at else None
            items.append(item_data)

        return jsonify({'success': True, 'items': items})


    @app.route('/api/my-list/toggle', methods=['POST'])
    @csrf.exempt
    @api_login_required
    def api_toggle_my_list():
        data = request.get_json(silent=True) or {}
        print("TOGGLE MY LIST PAYLOAD:", data)
        content_id = (data.get('content_id') or '').strip()
        content_type = (data.get('content_type') or '').strip().lower()

        if content_type not in ('movie', 'series') or not content_id:
            return jsonify({'success': False, 'message': 'Invalid content.'}), 400

        user_id = session['user_id']

        existing = UserList.query.filter_by(
            user_id=user_id,
            content_id=content_id,
            content_type=content_type
        ).first()

        if existing:
            db.session.delete(existing)
            db.session.commit()
            return jsonify({'success': True, 'in_list': False})

        # Validate content exists (prevents saving junk ids)
        if content_type == 'movie':
            if not Movie.query.get(content_id):
                return jsonify({'success': False, 'message': 'Movie not found.'}), 404
        else:
            if not Series.query.get(content_id):
                return jsonify({'success': False, 'message': 'Series not found.'}), 404

        db.session.add(UserList(user_id=user_id, content_id=content_id, content_type=content_type))
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            # In case of race condition, treat as "in list"
            return jsonify({'success': True, 'in_list': True})

        return jsonify({'success': True, 'in_list': True})
    





    @app.route('/api/stats')
    @nocache
    @admin_required
    def get_stats():
        try:
            movie_count = db.session.query(Movie.id).count()
            series_count = db.session.query(Series.id).count()
            pending_requests = db.session.query(MovieRequest.id).filter_by(status='Pending').count()
            total_users = db.session.query(User.id).count()
            pending_users = db.session.query(PendingUser.id).count()
            total_new_messages = db.session.query(ContactMessage.id).filter_by(status='New').count()
            return jsonify({
                'totalMovies': movie_count, 'totalSeries': series_count, 'pendingRequests': pending_requests,
                'totalUsers': total_users, 'pendingUsers': pending_users, 'totalNewMessages': total_new_messages
            })
        except Exception as e:
            return jsonify({'error': 'Failed to fetch statistics.', 'details': str(e)}), 500



    @app.route('/api/content', methods=['GET'])
    @nocache
    @admin_required
    def get_content():
        page = request.args.get('page', 1, type=int)
        search_query = (request.args.get('search') or '').strip()
        per_page = 24

        movies_query = Movie.query
        series_query = Series.query

        if search_query:
            search_pattern = f"%{search_query}%"

            movies_query = movies_query.filter(
                or_(
                    Movie.title.ilike(search_pattern),
                    Movie.genre.ilike(search_pattern),
                    Movie.director.ilike(search_pattern),
                    Movie.description.ilike(search_pattern),
                )
            )

            series_query = series_query.filter(
                or_(
                    Series.title.ilike(search_pattern),
                    Series.genre.ilike(search_pattern),
                    Series.director.ilike(search_pattern),
                    Series.description.ilike(search_pattern),
                )
            )

        movies = movies_query.order_by(Movie.created_at.desc()).all()
        series = series_query.order_by(Series.created_at.desc()).all()

        all_content = sorted(
            movies + series,
            key=lambda item: item.created_at,
            reverse=True
        )

        total = len(all_content)
        start = (page - 1) * per_page
        end = start + per_page

        paginated_items = all_content[start:end]
        has_next = end < total
        next_page_number = page + 1 if has_next else None

        return jsonify({
            'items': [item.to_dict() for item in paginated_items],
            'has_next': has_next,
            'next_page_number': next_page_number,
            'total_items': total
        })



    @app.route('/api/requests')
    @nocache
    @admin_required
    def get_requests():
        requests_list = (
            MovieRequest.query
            .options(joinedload(MovieRequest.user))
            .order_by(MovieRequest.date.desc())
            .all()
        )

        return jsonify([req.to_dict() for req in requests_list])
    

    @app.route('/api/request/submit', methods=['POST', 'OPTIONS'])
    @csrf.exempt
    def api_submit_request():
        if request.method == 'OPTIONS':
            return jsonify({'success': True}), 200

        data = request.get_json(silent=True)

        if data:
            title = (data.get('title') or data.get('movie_title') or '').strip()
            link = (data.get('link') or data.get('movie_link') or '').strip()
            notes = (data.get('notes') or '').strip()
            request_type = (data.get('request_type') or data.get('type') or '').strip()
        else:
            title = (
                request.form.get('title')
                or request.form.get('movie-title')
                or ''
            ).strip()

            link = (
                request.form.get('link')
                or request.form.get('movie-link')
                or ''
            ).strip()

            notes = (request.form.get('notes') or '').strip()

            request_type = (
                request.form.get('request_type')
                or request.form.get('request-type')
                or ''
            ).strip()

        if not title:
            return jsonify({
                'success': False,
                'message': 'Title is required.'
            }), 400

        final_notes = notes

        if request_type:
            final_notes = (
                f"Type: {request_type}\n\n{notes}"
                if notes
                else f"Type: {request_type}"
            )

        new_request = MovieRequest(
            user_id=session.get('user_id'),
            title=title,
            link=link,
            notes=final_notes
        )

        try:
            db.session.add(new_request)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Request submitted!',
                'request': new_request.to_dict()
            }), 201

        except Exception as e:
            db.session.rollback()

            return jsonify({
                'success': False,
                'message': f'Failed to submit request: {e}'
            }), 500



    @app.route('/api/contact/submit', methods=['POST'])
    @csrf.exempt
    def api_submit_contact():
        data = request.get_json(silent=True) or {}

        name = str(data.get('name') or '').strip()
        email = str(data.get('email') or '').strip()
        subject = str(data.get('subject') or '').strip()
        message = str(data.get('message') or '').strip()

        # Optional: if logged-in user exists and name/email are missing, fill from account.
        user_id = session.get('user_id')
        if user_id and (not name or not email):
            user = User.query.get(user_id)
            if user:
                if not name:
                    name = user.username or ''
                if not email:
                    email = user.email or ''

        if not name:
            return jsonify({
                'success': False,
                'message': 'Name is required.'
            }), 400

        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required.'
            }), 400

        if not message:
            return jsonify({
                'success': False,
                'message': 'Message is required.'
            }), 400

        if len(message) > 2000:
            return jsonify({
                'success': False,
                'message': 'Message is too long.'
            }), 400

        new_message = ContactMessage(
            name=name,
            email=email,
            subject=subject,
            message=message,
            status='New'
        )

        try:
            db.session.add(new_message)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Message sent successfully!',
                'contact_message': new_message.to_dict()
            })

        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500



    @app.route('/api/notifications', methods=['GET'])
    def get_user_notifications():
        if 'user_id' not in session:
            return jsonify({'notifications': [], 'unread_count': 0})
        user_id = session['user_id']
        notifs = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).limit(20).all()
        unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
        return jsonify({'notifications': [n.to_dict() for n in notifs], 'unread_count': unread_count})



    @app.route('/api/notifications/mark-all-read', methods=['POST'])
    @nocache
    @api_login_required
    @csrf.exempt
    def api_notifications_mark_all_read():
        user_id = session['user_id']

        Notification.query.filter_by(
            user_id=user_id,
            is_read=False
        ).update({
            'is_read': True
        })

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'All notifications marked as read.'
        })



    @app.route('/api/notifications/<int:notification_id>/mark-read', methods=['POST'])
    @nocache
    @api_login_required
    @csrf.exempt
    def api_notification_mark_read(notification_id):
        user_id = session['user_id']

        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=user_id
        ).first_or_404()

        notification.is_read = True
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Notification marked as read.'
        })