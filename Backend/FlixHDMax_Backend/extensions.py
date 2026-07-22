from flask_mail import Mail
from flask_wtf.csrf import CSRFProtect
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from authlib.integrations.flask_client import OAuth


db = SQLAlchemy()
mail = Mail()
csrf = CSRFProtect()
migrate = Migrate()
oauth = OAuth()