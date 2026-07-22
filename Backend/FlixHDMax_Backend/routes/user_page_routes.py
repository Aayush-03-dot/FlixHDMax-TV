import os
import uuid
from datetime import datetime

from flask import flash, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from extensions import db, csrf
from forms import MyBaseForm
from models import Movie, MovieRequest, Notification, Series, User, UserList
from services.media_service import get_display_thumbnail, get_profile_image_url
from utils.decorators import api_login_required, login_required, nocache
from utils.uploads import allowed_file


def register_user_page_routes(app):
    @app.route("/logout")
    def user_logout():
        session.clear()
        flash("You have been successfully logged out.", "success")
        return redirect(url_for("login"))

    @app.route("/profile")
    @nocache
    def profile_page():
        form = MyBaseForm()

        if "user_id" not in session:
            return redirect(url_for("login"))

        user = User.query.get_or_404(session["user_id"])
        profile_img = get_profile_image_url(user)

        return render_template(
            "profile.html",
            form=form,
            user=user,
            profile_img=profile_img
        )

    @app.route("/my-list")
    @nocache
    @login_required
    def my_list_page():
        form = MyBaseForm()
        user_id = session["user_id"]

        entries = (
            UserList.query
            .filter_by(user_id=user_id)
            .order_by(UserList.created_at.desc())
            .all()
        )

        movie_ids = [
            entry.content_id
            for entry in entries
            if entry.content_type == "movie"
        ]

        series_ids = [
            entry.content_id
            for entry in entries
            if entry.content_type == "series"
        ]

        movies = Movie.query.filter(Movie.id.in_(movie_ids)).all() if movie_ids else []
        series = Series.query.filter(Series.id.in_(series_ids)).all() if series_ids else []

        movie_map = {movie.id: movie for movie in movies}
        series_map = {show.id: show for show in series}

        items = []

        for entry in entries:
            obj = (
                movie_map.get(entry.content_id)
                if entry.content_type == "movie"
                else series_map.get(entry.content_id)
            )

            if obj:
                obj.thumbnail_display = get_display_thumbnail(obj)
                obj.content_type = entry.content_type
                items.append(obj)

        return render_template(
            "my_list.html",
            form=form,
            items=items
        )

    @app.route('/account/settings', methods=['GET', 'POST'])
    @nocache
    def account_settings():
        form = MyBaseForm()
        if 'user_id' not in session:
            return redirect(url_for('login'))

        user = User.query.get_or_404(session['user_id'])

        if request.method == 'POST':
            action = (request.form.get('action') or '').strip()

            # ---------------- UPDATE PROFILE (name/email/username) ----------------
            if action == 'update_profile':
                new_username = (request.form.get('username') or '').strip()
                new_display_name = (request.form.get('display_name') or '').strip()
                new_email = (request.form.get('email') or '').strip().lower()

                if not new_username or not new_email:
                    flash("Username and Email are required.", "error")
                    return redirect(url_for('account_settings'))

                # uniqueness checks
                if new_username != user.username and User.query.filter_by(username=new_username).first():
                    flash("That username is already taken.", "error")
                    return redirect(url_for('account_settings'))

                if new_email != user.email and User.query.filter_by(email=new_email).first():
                    flash("That email is already in use.", "error")
                    return redirect(url_for('account_settings'))

                user.username = new_username
                user.display_name = new_display_name if new_display_name else None
                user.email = new_email

                # keep session consistent
                session['user'] = user.username

                db.session.commit()
                flash("Profile updated successfully.", "success")
                return redirect(url_for('account_settings'))

            # ---------------- UPDATE PASSWORD ----------------
            if action == 'change_password':
                current_password = request.form.get('current_password', '')
                new_password = request.form.get('new_password', '')
                confirm_password = request.form.get('confirm_password', '')

                if not check_password_hash(user.password, current_password):
                    flash("Current password is incorrect.", "error")
                    return redirect(url_for('account_settings'))

                if not new_password or len(new_password) < 8:
                    flash("New password must be at least 8 characters.", "error")
                    return redirect(url_for('account_settings'))

                if new_password != confirm_password:
                    flash("New password and confirmation do not match.", "error")
                    return redirect(url_for('account_settings'))

                user.password = generate_password_hash(new_password)
                user.password_changed_at = datetime.utcnow()
                db.session.commit()
                flash("Password changed successfully.", "success")
                return redirect(url_for('account_settings'))

            # ---------------- UPLOAD PROFILE PICTURE ----------------
            if action == 'upload_avatar':
                profile_file = request.files.get('profile_image')

                if not profile_file or profile_file.filename == '':
                    flash("Please choose an image to upload.", "error")
                    return redirect(url_for('account_settings'))

                if not allowed_file(profile_file.filename):
                    flash("Invalid file type. Allowed types: png, jpg, jpeg, gif.", "error")
                    return redirect(url_for('account_settings'))

                filename = secure_filename(profile_file.filename)
                ext = os.path.splitext(filename)[1].lower()

                # IMPORTANT: no trailing space
                new_filename = f"profile_{user.id}_{uuid.uuid4().hex}{ext}"

                # Save into /static/uploads/profiles/
                os.makedirs(app.config['PROFILE_UPLOAD_FOLDER'], exist_ok=True)
                save_path = os.path.join(app.config['PROFILE_UPLOAD_FOLDER'], new_filename)
                profile_file.save(save_path)

                # Delete old avatar file (if exists)
                if user.profile_image:
                    old_path = os.path.join(app.config['PROFILE_UPLOAD_FOLDER'], user.profile_image)
                    if os.path.exists(old_path):
                        try:
                            os.remove(old_path)
                        except Exception:
                            pass

                # Always update DB (even if user had no previous image)
                user.profile_image = new_filename
                db.session.commit()
                flash("Profile picture updated successfully.", "success")
                return redirect(url_for('account_settings'))

            # ---------------- DELETE ACCOUNT ----------------
            if action == 'delete_account':
                confirm = (request.form.get('confirm_delete') or '').strip().lower()
                password = request.form.get('delete_password', '')

                if confirm != "delete":
                    flash('Type "delete" to confirm.', 'error')
                    return redirect(url_for('account_settings'))

                if not check_password_hash(user.password, password):
                    flash("Password incorrect.", "error")
                    return redirect(url_for('account_settings'))

                try:
                    # delete avatar file
                    if user.profile_image:
                        p = os.path.join(app.config['PROFILE_UPLOAD_FOLDER'], user.profile_image)
                        if os.path.exists(p):
                            try:
                                os.remove(p)
                            except Exception:
                                pass

                    # delete dependent rows
                    Notification.query.filter_by(user_id=user.id).delete()
                    UserList.query.filter_by(user_id=user.id).delete()

                    db.session.delete(user)
                    db.session.commit()

                    session.clear()
                    flash("Account deleted successfully.", "success")
                    return redirect(url_for('login'))
                except Exception as e:
                    db.session.rollback()
                    flash(f"Failed to delete account: {e}", "error")
                    return redirect(url_for('account_settings'))

            flash("Invalid action.", "error")
            return redirect(url_for('account_settings'))

        # GET request: render page
        profile_img = get_profile_image_url(user)
        return render_template('account_settings.html', form=form, user=user, profile_img=profile_img)

    @app.route('/api/account/settings', methods=['GET'])
    @nocache
    @api_login_required
    def api_get_account_settings():
        user = User.query.get_or_404(session['user_id'])

        profile_img = get_profile_image_url(user)

        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'display_name': user.display_name,
                'email': user.email,
                'role': user.role,
                'profile_image': user.profile_image,
                'created_at': user.created_at.isoformat() if getattr(user, 'created_at', None) else None,
                'login_count': getattr(user, 'login_count', 0) or 0,
            },
            'profile_img': profile_img,
            'notification_preferences': {
                'new_content_alerts': True,
                'request_updates': True,
                'account_alerts': True,
                'announcements': True,
                'promotional_messages': False,
            }
        })


    @app.route('/api/account/settings/profile', methods=['POST'])
    @nocache
    @api_login_required
    @csrf.exempt
    def api_update_account_profile():
        user = User.query.get_or_404(session['user_id'])
        data = request.get_json(silent=True) or {}

        new_username = (data.get('username') or '').strip()
        new_display_name = (data.get('display_name') or '').strip()
        new_email = (data.get('email') or '').strip().lower()

        if not new_username or not new_email:
            return jsonify({
                'success': False,
                'message': 'Username and email are required.'
            }), 400

        username_exists = (
            User.query
            .filter(User.username == new_username, User.id != user.id)
            .first()
        )

        if username_exists:
            return jsonify({
                'success': False,
                'message': 'That username is already taken.'
            }), 400

        email_exists = (
            User.query
            .filter(User.email == new_email, User.id != user.id)
            .first()
        )

        if email_exists:
            return jsonify({
                'success': False,
                'message': 'That email is already in use.'
            }), 400

        user.username = new_username
        user.display_name = new_display_name if new_display_name else None
        user.email = new_email

        session['user'] = user.username

        try:
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Profile updated successfully.',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'display_name': user.display_name,
                    'email': user.email,
                    'role': user.role,
                    'profile_image': user.profile_image,
                    'created_at': user.created_at.isoformat() if getattr(user, 'created_at', None) else None,
                    'login_count': getattr(user, 'login_count', 0) or 0,
                },
                'profile_img': get_profile_image_url(user)
            })

        except Exception as e:
            db.session.rollback()

            return jsonify({
                'success': False,
                'message': f'Failed to update profile: {str(e)}'
            }), 500


    @app.route('/api/account/settings/password', methods=['POST'])
    @nocache
    @api_login_required
    @csrf.exempt
    def api_change_account_password():
        user = User.query.get_or_404(session['user_id'])
        data = request.get_json(silent=True) or {}

        current_password = data.get('current_password') or ''
        new_password = data.get('new_password') or ''
        confirm_password = data.get('confirm_password') or ''

        if not check_password_hash(user.password, current_password):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect.'
            }), 400

        if not new_password or len(new_password) < 8:
            return jsonify({
                'success': False,
                'message': 'New password must be at least 8 characters.'
            }), 400

        if new_password != confirm_password:
            return jsonify({
                'success': False,
                'message': 'New password and confirmation do not match.'
            }), 400

        user.password = generate_password_hash(new_password)
        user.password_changed_at = datetime.utcnow()

        try:
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Password changed successfully.'
            })

        except Exception as e:
            db.session.rollback()

            return jsonify({
                'success': False,
                'message': f'Failed to change password: {str(e)}'
            }), 500


    @app.route('/api/account/settings/avatar', methods=['POST'])
    @nocache
    @api_login_required
    @csrf.exempt
    def api_upload_account_avatar():
        user = User.query.get_or_404(session['user_id'])

        profile_file = request.files.get('profile_image')

        if not profile_file or profile_file.filename == '':
            return jsonify({
                'success': False,
                'message': 'Please choose an image to upload.'
            }), 400

        if not allowed_file(profile_file.filename):
            return jsonify({
                'success': False,
                'message': 'Invalid file type. Allowed types: png, jpg, jpeg, gif.'
            }), 400

        filename = secure_filename(profile_file.filename)
        ext = os.path.splitext(filename)[1].lower()
        new_filename = f"profile_{user.id}_{uuid.uuid4().hex}{ext}"

        try:
            os.makedirs(app.config['PROFILE_UPLOAD_FOLDER'], exist_ok=True)

            save_path = os.path.join(app.config['PROFILE_UPLOAD_FOLDER'], new_filename)
            profile_file.save(save_path)

            if user.profile_image:
                old_path = os.path.join(app.config['PROFILE_UPLOAD_FOLDER'], user.profile_image)

                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except Exception:
                        pass

            user.profile_image = new_filename
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Profile picture updated successfully.',
                'profile_img': get_profile_image_url(user),
                'profile_image': user.profile_image
            })

        except Exception as e:
            db.session.rollback()

            return jsonify({
                'success': False,
                'message': f'Failed to upload profile picture: {str(e)}'
            }), 500


    @app.route('/api/account/settings/notifications', methods=['POST'])
    @nocache
    @api_login_required
    @csrf.exempt
    def api_save_notification_preferences():
        # Your current database does not seem to store these preferences yet.
        # This keeps the React page working and can be connected to DB later.
        return jsonify({
            'success': True,
            'message': 'Notification preferences saved.'
        })


    @app.route('/api/account/settings/delete', methods=['POST'])
    @nocache
    @api_login_required
    @csrf.exempt
    def api_delete_account():
        user = User.query.get_or_404(session['user_id'])
        data = request.get_json(silent=True) or {}

        confirm = (data.get('confirm_delete') or '').strip().lower()
        password = data.get('delete_password') or ''

        if confirm != 'delete':
            return jsonify({
                'success': False,
                'message': 'Type "delete" to confirm.'
            }), 400

        if not check_password_hash(user.password, password):
            return jsonify({
                'success': False,
                'message': 'Password incorrect.'
            }), 400

        try:
            if user.profile_image:
                profile_path = os.path.join(app.config['PROFILE_UPLOAD_FOLDER'], user.profile_image)

                if os.path.exists(profile_path):
                    try:
                        os.remove(profile_path)
                    except Exception:
                        pass

            Notification.query.filter_by(user_id=user.id).delete()
            UserList.query.filter_by(user_id=user.id).delete()

            # Keep request history but detach deleted user.
            try:
                MovieRequest.query.filter_by(user_id=user.id).update({'user_id': None})
            except Exception:
                pass

            db.session.delete(user)
            db.session.commit()

            session.clear()

            return jsonify({
                'success': True,
                'message': 'Account deleted successfully.'
            })

        except Exception as e:
            db.session.rollback()

            return jsonify({
                'success': False,
                'message': f'Failed to delete account: {str(e)}'
            }), 500