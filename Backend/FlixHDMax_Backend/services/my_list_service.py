from flask import session

from extensions import db
from models import UserList


def _mylist_key(content_type, content_id):
    return f"{content_type}:{content_id}"


def get_my_list_keys_for_current_user():
    my_list_keys = set()

    if "user_id" in session:
        rows = db.session.query(
            UserList.content_id,
            UserList.content_type
        ).filter(UserList.user_id == session["user_id"]).all()

        my_list_keys = {_mylist_key(t, cid) for (cid, t) in rows}

    return my_list_keys