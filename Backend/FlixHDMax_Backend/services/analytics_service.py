from datetime import datetime, timedelta, timezone

from flask import request

from extensions import db


def utc_dt_ms(ms: int) -> str:
    dt = datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc)
    return dt.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]


def get_device_type(user_agent: str) -> str:
    ua = (user_agent or "").lower()

    if "mobile" in ua and "ipad" not in ua:
        return "mobile"

    if "ipad" in ua or "tablet" in ua:
        return "tablet"

    if ua:
        return "desktop"

    return "unknown"


def get_db_connection():
    """
    Reuse the SQLAlchemy engine's DBAPI connection.
    This avoids duplicating DATABASE_URL credentials and keeps SSL settings.
    """
    return db.engine.raw_connection()


def rows_to_dicts(cur, rows):
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]


def _parse_date_range():
    """
    Reads ?from=YYYY-MM-DD&to=YYYY-MM-DD.
    Returns (from_dt_str, to_dt_str) for SQL as DATETIME range.
    Defaults: last 7 days including today.
    """
    f = (request.args.get("from") or "").strip()
    t = (request.args.get("to") or "").strip()

    if not f or not t:
        today = datetime.utcnow().date()
        start = today - timedelta(days=6)
        end = today
    else:
        start = datetime.strptime(f, "%Y-%m-%d").date()
        end = datetime.strptime(t, "%Y-%m-%d").date()

    from_dt = f"{start} 00:00:00.000"
    to_dt = f"{end} 23:59:59.999"

    return from_dt, to_dt


def _fetch_dicts(cur):
    rows = cur.fetchall()
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]