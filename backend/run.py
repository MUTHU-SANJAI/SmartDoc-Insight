# smartdoc-insight/backend/run.py
from app import create_app
from dotenv import load_dotenv
import os

# Load environment variables from the .env file
load_dotenv()

# Create the Flask application instance
app = create_app()

if __name__ == '__main__':
    # Run the app in debug mode on port 5000
    # In production, you'd use a WSGI server like Gunicorn (via wsgi.py)
    app.run(debug=True, port=5000)