from datetime import datetime

from flask import flash, jsonify, redirect, request, session, url_for

from models import User


def register_security_hooks(app):
    @app.before_request
    def enforce_user_security():
        uid = session.get("user_id")

        if not uid:
            return

        user = User.query.get(uid)

        # 1. Handle banned / inactive users
        if not user or not user.is_active:
            session.clear()

            if request.path.startswith("/api/"):
                return jsonify({
                    "success": False,
                    "error": "banned"
                }), 401

            flash("Your account has been suspended.", "error")
            return redirect(url_for("login"))

        # 2. Enforce session invalidation after password change
        login_time_str = session.get("login_time")

        if login_time_str and user.password_changed_at:
            try:
                login_time = datetime.fromisoformat(login_time_str)

                if user.password_changed_at > login_time:
                    session.clear()

                    if request.path.startswith("/api/"):
                        return jsonify({
                            "success": False,
                            "error": "session_expired"
                        }), 401

                    flash("Your session expired due to password change. Please log in again.", "info")
                    return redirect(url_for("login"))

            except Exception as e:
                print("Session time parse error:", e)
                session.clear()
                return redirect(url_for("login"))