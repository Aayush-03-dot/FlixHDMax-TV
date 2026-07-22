from flask import jsonify

from models import Page
from utils.decorators import nocache


def register_legal_routes(app):
   

    @app.route("/api/pages/<page_key>", methods=["GET"])
    @nocache
    def api_get_system_page(page_key):
        allowed_pages = {"privacy", "terms", "cookies", "faq"}

        if page_key not in allowed_pages:
            return jsonify({
                "success": False,
                "message": "Page not found."
            }), 404

        page = Page.query.filter_by(
            key=page_key,
            is_published=True
        ).first()

        if not page:
            return jsonify({
                "success": False,
                "message": "Page not found."
            }), 404

        return jsonify({
            "success": True,
            "page": {
                "id": page.id,
                "key": page.key,
                "title": page.title,
                "content": page.content,
                "updated_at": page.updated_at.isoformat() if getattr(page, "updated_at", None) else None,
            }
        })