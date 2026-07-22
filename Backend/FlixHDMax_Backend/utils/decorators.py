from functools import wraps

from flask import flash, jsonify, make_response, redirect, request, session, url_for


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("admin"):
            is_api_call = request.path.startswith("/api/")
            is_ajax_request = request.headers.get("X-Requested-With") == "XMLHttpRequest"

            if is_api_call or is_ajax_request:
                return jsonify({
                    "error": "Unauthorized: Admin access required",
                    "code": 403
                }), 403

            flash("Admin access required. Please log in.", "error")
            return redirect(url_for("admin_login"))

        return f(*args, **kwargs)

    return decorated_function


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))

        return f(*args, **kwargs)

    return decorated


def api_login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({
                "success": False,
                "message": "Unauthorized"
            }), 401

        return f(*args, **kwargs)

    return decorated


def nocache(view):
    @wraps(view)
    def no_cache_impl(*args, **kwargs):
        response = make_response(view(*args, **kwargs))
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "-1"
        return response

    return no_cache_impl