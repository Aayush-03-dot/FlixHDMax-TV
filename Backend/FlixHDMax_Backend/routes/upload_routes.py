from flask import current_app, send_from_directory


def register_upload_routes(app):
    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        resp = send_from_directory(
            current_app.config["UPLOAD_FOLDER"],
            filename
        )

        resp.headers["Cache-Control"] = "public, max-age=2592000"

        return resp