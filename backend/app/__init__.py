# backend/app/__init__.py
from flask import Flask
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__)
    app.config.from_pyfile('config.py')

    # Initialize Flask-CORS with explicit resources for broader coverage
    CORS(app, resources={r"/*": {"origins": "*"}}) # CHANGED LINE

    from . import main_routes
    app.register_blueprint(main_routes.bp)

    return app