import random
from datetime import datetime, timedelta
import secrets
from flask import url_for
from utils.helper_function import make_username_from_email, set_login_session, get_frontend_url
from extensions import db, oauth

from flask import jsonify, request, session,flash, redirect
from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db, csrf
from models import User, PendingUser
from services.mail_service import send_otp_email, send_password_reset_email
from services.token_service import verify_password_reset_token


def register_auth_api_routes(app):
    @app.route('/api/login', methods=['POST'])
    @csrf.exempt
    def api_login():
        data = request.get_json(silent=True) or {}

        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''

        if not email or not password:
            return jsonify({
                "success": False,
                "error": "Email and password are required."
            }), 400

        user = User.query.filter_by(email=email).first()
        pending_user = PendingUser.query.filter_by(email=email).first()

        if user:
            if not user.is_active:
                return jsonify({
                    "success": False,
                    "error": "Your account has been suspended."
                }), 403

            if check_password_hash(user.password, password):
                session.permanent = True
                session['user'] = user.username
                session['user_role'] = user.role
                session['user_id'] = user.id
                session['login_time'] = datetime.utcnow().isoformat()

                user.last_login_at = datetime.utcnow()
                user.login_count = (user.login_count or 0) + 1
                db.session.commit()

                return jsonify({
                    "success": True,
                    "message": "Login successful!",
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "role": user.role
                    }
                })

            return jsonify({
                "success": False,
                "error": "Invalid email or password."
            }), 401

        if pending_user:
            session['pending_email'] = email

            return jsonify({
                "success": False,
                "error": "Your account is awaiting email verification.",
                "needs_verification": True
            }), 403

        return jsonify({
            "success": False,
            "error": "Invalid email or password."
        }), 401


    @app.route('/api/logout', methods=['POST', 'OPTIONS'])
    @csrf.exempt
    def api_logout():
        if request.method == 'OPTIONS':
            return jsonify({"ok": True}), 200

        session.clear()

        return jsonify({
            "success": True,
            "message": "Logged out successfully."
        })


    @app.route('/api/register', methods=['POST', 'OPTIONS'])
    @csrf.exempt
    def api_register():
        if request.method == 'OPTIONS':
            return jsonify({"ok": True}), 200

        data = request.get_json(silent=True) or {}

        username = (data.get('username') or '').strip()
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''

        if not all([username, email, password]):
            return jsonify({
                "success": False,
                "error": "All fields are required."
            }), 400

        now = datetime.utcnow()
        expiration_cutoff = now - timedelta(
            minutes=app.config['OTP_EXPIRATION_MINUTES']
        )

        expired_pending_email = PendingUser.query.filter_by(email=email).filter(
            PendingUser.created_at < expiration_cutoff
        ).first()

        if expired_pending_email:
            db.session.delete(expired_pending_email)
            db.session.commit()

        expired_pending_username = PendingUser.query.filter_by(username=username).filter(
            PendingUser.created_at < expiration_cutoff
        ).first()

        if expired_pending_username:
            db.session.delete(expired_pending_username)
            db.session.commit()

        if User.query.filter_by(email=email).first() or PendingUser.query.filter_by(email=email).first():
            return jsonify({
                "success": False,
                "error": "This email address is already registered or currently awaiting verification."
            }), 409

        if User.query.filter_by(username=username).first() or PendingUser.query.filter_by(username=username).first():
            return jsonify({
                "success": False,
                "error": "This username is already taken or currently awaiting verification."
            }), 409

        otp = str(random.randint(100000, 999999))

        new_pending_user = PendingUser(
            username=username,
            email=email,
            password=generate_password_hash(password),
            otp=otp
        )

        db.session.add(new_pending_user)

        try:
            send_otp_email(email, otp)
            db.session.commit()

            session['pending_email'] = email

            return jsonify({
                "success": True,
                "message": "Verification code sent to your email.",
                "needs_verification": True,
                "redirect": "/verify-email"
            }), 201

        except Exception as e:
            db.session.rollback()
            print("REGISTER API ERROR:", e)

            return jsonify({
                "success": False,
                "error": "An error occurred on the server. Please try again later."
            }), 500


    @app.route('/api/verify-email/status', methods=['GET'])
    def api_verify_email_status():
        pending_email = session.get('pending_email')

        if not pending_email:
            return jsonify({
                "success": False,
                "email": None,
                "error": "Please register first."
            }), 404

        pending_user = PendingUser.query.filter_by(email=pending_email).first()

        if not pending_user:
            session.pop('pending_email', None)

            return jsonify({
                "success": False,
                "email": None,
                "error": "Your verification session has expired. Please register again."
            }), 404

        return jsonify({
            "success": True,
            "email": pending_email
        })


    @app.route('/api/verify-email', methods=['POST', 'OPTIONS'])
    @csrf.exempt
    def api_verify_email():
        if request.method == 'OPTIONS':
            return jsonify({"ok": True}), 200

        pending_email = session.get('pending_email')

        if not pending_email:
            return jsonify({
                "success": False,
                "error": "Please register first.",
                "redirect": "/register"
            }), 400

        pending_user = PendingUser.query.filter_by(email=pending_email).first()

        if not pending_user:
            session.pop('pending_email', None)

            return jsonify({
                "success": False,
                "error": "Your verification session has expired. Please register again.",
                "redirect": "/register"
            }), 400

        data = request.get_json(silent=True) or {}
        entered_otp = (data.get('otp') or '').strip()

        if not entered_otp:
            return jsonify({
                "success": False,
                "error": "Please enter the verification code."
            }), 400

        if pending_user.otp != entered_otp:
            return jsonify({
                "success": False,
                "error": "Invalid OTP."
            }), 400

        new_user = User(
            username=pending_user.username,
            email=pending_user.email,
            password=pending_user.password
        )

        db.session.add(new_user)
        db.session.delete(pending_user)
        db.session.commit()

        session.pop('pending_email', None)

        return jsonify({
            "success": True,
            "message": "Account verified successfully! Please log in.",
            "redirect": "/login?registration_success=true"
        })


    @app.route('/api/verify-email/resend', methods=['POST', 'OPTIONS'])
    @csrf.exempt
    def api_resend_verify_email():
        if request.method == 'OPTIONS':
            return jsonify({"ok": True}), 200

        pending_email = session.get('pending_email')

        if not pending_email:
            return jsonify({
                "success": False,
                "error": "Please register first.",
                "redirect": "/register"
            }), 400

        pending_user = PendingUser.query.filter_by(email=pending_email).first()

        if not pending_user:
            session.pop('pending_email', None)

            return jsonify({
                "success": False,
                "error": "Your verification session has expired. Please register again.",
                "redirect": "/register"
            }), 400

        now = datetime.utcnow()

        # Simple server-side cooldown using created_at as last OTP sent time
        if pending_user.created_at:
            seconds_since_last_code = (now - pending_user.created_at).total_seconds()

            if seconds_since_last_code < 60:
                retry_after = int(60 - seconds_since_last_code)

                return jsonify({
                    "success": False,
                    "error": f"Please wait {retry_after} seconds before requesting another code.",
                    "retry_after": retry_after
                }), 429

        new_otp = str(random.randint(100000, 999999))

        pending_user.otp = new_otp
        pending_user.created_at = now

        try:
            send_otp_email(pending_email, new_otp)
            db.session.commit()

            return jsonify({
                "success": True,
                "message": "A new verification code has been sent to your email.",
                "email": pending_email,
                "cooldown_seconds": 60
            })

        except Exception as e:
            db.session.rollback()
            print("RESEND OTP ERROR:", e)

            return jsonify({
                "success": False,
                "error": "Could not send a new code right now. Please try again later."
            }), 500


    @app.route('/api/forgot-password', methods=['POST', 'OPTIONS'])
    @csrf.exempt
    def api_forgot_password():
        if request.method == 'OPTIONS':
            return jsonify({"ok": True}), 200

        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()

        if not email:
            return jsonify({
                "success": False,
                "error": "Please enter your email address."
            }), 400

        user = User.query.filter_by(email=email).first()

        # Important: do not reveal whether an email exists or not
        if user and user.is_active:
            try:
                send_password_reset_email(user)
            except Exception as e:
                print("FORGOT PASSWORD API ERROR:", e)

                return jsonify({
                    "success": False,
                    "error": "We could not send the reset email right now. Please try again later."
                }), 500

        return jsonify({
            "success": True,
            "message": "If an account with that email exists, a password reset link has been sent.",
            "redirect": "/login"
        })


    @app.route('/api/reset-password/<path:token>', methods=['POST', 'OPTIONS'])
    @csrf.exempt
    def api_reset_password(token):
        if request.method == 'OPTIONS':
            return jsonify({"ok": True}), 200

        email = verify_password_reset_token(token)

        if not email:
            return jsonify({
                "success": False,
                "error": "This reset link is invalid or has expired.",
                "redirect": "/forgot-password"
            }), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({
                "success": False,
                "error": "Invalid reset request.",
                "redirect": "/forgot-password"
            }), 400

        data = request.get_json(silent=True) or {}

        new_password = (data.get("new_password") or "").strip()
        confirm_password = (data.get("confirm_password") or "").strip()

        if not new_password or not confirm_password:
            return jsonify({
                "success": False,
                "error": "Please fill in all fields."
            }), 400

        if len(new_password) < 8:
            return jsonify({
                "success": False,
                "error": "Password must be at least 8 characters long."
            }), 400

        if new_password != confirm_password:
            return jsonify({
                "success": False,
                "error": "Passwords do not match."
            }), 400

        user.password = generate_password_hash(new_password)
        user.password_changed_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Your password has been reset successfully. Please log in.",
            "redirect": "/login"
        })


    @app.route('/api/reset-password/<token>/status', methods=['GET', 'OPTIONS'])
    @csrf.exempt
    def api_reset_password_status(token):
        if request.method == 'OPTIONS':
            return jsonify({"ok": True}), 200

        email = verify_password_reset_token(token)

        if not email:
            return jsonify({
                "success": False,
                "valid": False,
                "error": "This reset link is invalid or has expired."
            }), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({
                "success": False,
                "valid": False,
                "error": "Invalid reset request."
            }), 400

        return jsonify({
            "success": True,
            "valid": True,
            "email": email
        })
    

    

    @app.route("/auth/google/login")
    def google_login():
        redirect_uri = url_for("google_callback", _external=True)
        return oauth.google.authorize_redirect(redirect_uri)


    @app.route("/auth/google/callback")
    def google_callback():
        frontend_url = get_frontend_url()

        try:
            token = oauth.google.authorize_access_token()
        except Exception as e:
            
            return redirect(f"{frontend_url}/login?google_error=token")

        try:
            userinfo = token.get("userinfo")

            if not userinfo:
                try:
                    userinfo = oauth.google.parse_id_token(token)
                except Exception:
                    userinfo = None

            if not userinfo:
                userinfo_response = oauth.google.get(
                    "https://openidconnect.googleapis.com/v1/userinfo"
                )
                userinfo = userinfo_response.json()

        except Exception as e:
            
            return redirect(f"{frontend_url}/login?google_error=userinfo")

        google_id = str(userinfo.get("sub") or "").strip()
        email = (userinfo.get("email") or "").lower().strip()
        email_verified = userinfo.get("email_verified")
        display_name = (userinfo.get("name") or "").strip() or None

        if isinstance(email_verified, str):
            email_verified = email_verified.lower() == "true"

        if not google_id or not email:
            return redirect(f"{frontend_url}/login?google_error=missing_email")

        if not email_verified:
            return redirect(f"{frontend_url}/login?google_error=unverified")

        try:
            user = User.query.filter_by(google_id=google_id).first()

            if not user:
                user = User.query.filter_by(email=email).first()

                if user:
                    user.google_id = google_id
                    user.auth_provider = "google"

                    if display_name and not user.display_name:
                        user.display_name = display_name
                else:
                    user = User(
                        username=make_username_from_email(email),
                        email=email,
                        password=generate_password_hash(secrets.token_urlsafe(32)),
                        google_id=google_id,
                        auth_provider="google",
                        display_name=display_name,
                        role="user",
                        is_active=True,
                    )
                    db.session.add(user)
                    db.session.flush()

            if not user.is_active:
                db.session.rollback()
                return redirect(f"{frontend_url}/login?google_error=disabled")

            set_login_session(user)

            return redirect(f"{frontend_url}/")

        except Exception as e:
            db.session.rollback()
            
            return redirect(f"{frontend_url}/login?google_error=db")