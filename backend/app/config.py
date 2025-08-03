# smartdoc-insight/backend/app/config.py
import os

# A secret key is crucial for Flask security (e.g., session management).
# Load from environment variable for production, use a placeholder for development.
SECRET_KEY = os.environ.get('SECRET_KEY', 'a_very_long_random_string_for_development_only_replace_in_prod')

# Placeholder for OpenAI API key, will be loaded from .env
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Add other configurations here as needed (e.g., database URLs)