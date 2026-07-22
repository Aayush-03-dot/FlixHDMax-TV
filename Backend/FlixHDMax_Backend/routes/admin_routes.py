import secrets

from flask import jsonify, session, current_app, request
from werkzeug.security import check_password_hash

from extensions import csrf
from utils.decorators import nocache
from models import User


def _make_admin_path():
    route_key = session.get("admin_route_key")

    if not route_key:
        route_key = secrets.token_urlsafe(24)
        session["admin_route_key"] = route_key

    return f"/admin/portal/{route_key}"


def _clear_admin_session_only():
    session.pop("admin", None)
    session.pop("admin_username", None)
    session.pop("admin_user_id", None)
    session.pop("admin_route_key", None)


def register_admin_routes(app):
    @app.route("/api/admin/route")
    @nocache
    def api_admin_route():
        """
        Returns a changing React admin dashboard path.

        Allowed when:
        - admin session is already active, OR
        - public/homepage user is logged in with admin role.
        """
        is_admin_session = bool(session.get("admin"))
        is_admin_role_user = session.get("user_role") == "admin"

        if not is_admin_session and not is_admin_role_user:
            return jsonify({
                "success": False,
                "message": "Admin access required."
            }), 403

        # Change route key each time Admin Panel is clicked.
        route_key = secrets.token_urlsafe(24)
        session["admin_route_key"] = route_key

        return jsonify({
            "success": True,
            "admin_path": f"/admin/portal/{route_key}"
        })

    @app.route("/api/admin/me")
    @nocache
    def api_admin_me():
        if not session.get("admin"):
            return jsonify({
                "success": False,
                "authenticated": False,
                "is_admin": False
            }), 401

        expected_route_key = session.get("admin_route_key")
        route_key = request.args.get("route_key", "").strip()

        if expected_route_key and route_key and route_key != expected_route_key:
            return jsonify({
                "success": False,
                "authenticated": False,
                "is_admin": False,
                "message": "Invalid admin route."
            }), 404

        if not expected_route_key:
            expected_route_key = secrets.token_urlsafe(24)
            session["admin_route_key"] = expected_route_key

        user = None

        admin_user_id = session.get("admin_user_id")
        if admin_user_id:
            user = User.query.get(admin_user_id)

        if not user and session.get("user_id"):
            user = User.query.get(session.get("user_id"))

        admin_username = current_app.config.get("ADMIN_USERNAME", "admin")

        return jsonify({
            "success": True,
            "authenticated": True,
            "is_admin": True,
            "admin_path": f"/admin/portal/{expected_route_key}",
            "user": user.to_dict() if user else {
                "username": session.get("admin_username") or session.get("user") or admin_username,
                "role": "admin"
            }
        })

    @app.route("/api/admin/login", methods=["POST"])
    @nocache
    @csrf.exempt
    def api_admin_login():
        data = request.get_json(silent=True) or {}

        submitted_username = (data.get("username") or "").strip()
        submitted_password = data.get("password") or ""

        admin_username = current_app.config.get("ADMIN_USERNAME")
        admin_password_hash = current_app.config.get("ADMIN_PASSWORD_HASH")

        if not admin_username or not admin_password_hash:
            return jsonify({
                "success": False,
                "message": "Admin credentials are not configured."
            }), 500

        if submitted_username != admin_username or not check_password_hash(admin_password_hash, submitted_password):
            return jsonify({
                "success": False,
                "message": "Invalid admin credentials."
            }), 401

        session["admin"] = True
        session["admin_username"] = admin_username

        admin_user = User.query.filter_by(username=admin_username).first()
        if admin_user:
            session["admin_user_id"] = admin_user.id

        admin_path = _make_admin_path()

        return jsonify({
            "success": True,
            "message": "Admin login successful.",
            "admin_path": admin_path,
            "user": admin_user.to_dict() if admin_user else {
                "username": admin_username,
                "role": "admin"
            }
        })

    @app.route("/api/admin/logout", methods=["POST"])
    @nocache
    @csrf.exempt
    def api_admin_logout():
        _clear_admin_session_only()

        return jsonify({
            "success": True,
            "message": "Admin session ended."
        })