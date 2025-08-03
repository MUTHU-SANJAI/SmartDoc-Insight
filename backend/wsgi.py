# smartdoc-insight/backend/wsgi.py
from app import create_app
from dotenv import load_dotenv
import os

# Load environment variables for production environment
load_dotenv()

app = create_app()

# This file is used by WSGI servers (e.g., Gunicorn) to run the Flask app.
# Example Gunicorn command: gunicorn wsgi:app -w 4 -b 0.0.0.0:5000