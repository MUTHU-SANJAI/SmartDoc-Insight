# backend/app/services/session_manager.py
import firebase_admin
from firebase_admin import credentials, firestore
import os
import uuid
import time
import json

# Corrected path to your Firebase service account key file
# It should be in the 'app' directory, one level up from 'services'
SERVICE_ACCOUNT_KEY_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'firebase_service_account.json')
# Initialize Firebase Admin SDK (only once)
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
    except FileNotFoundError:
        print(f"ERROR: Firebase service account key not found at {SERVICE_ACCOUNT_KEY_PATH}")
        print("Please ensure 'firebase_service_account.json' is in backend/app/.")
        # In a production app, you might want to exit or log a critical error
    except Exception as e:
        print(f"ERROR initializing Firebase Admin SDK: {e}")
        # In a production app, you might want to exit or log a critical error

db = firestore.client()

def save_session(search_term: str, document_content: str, highlighted_html: str) -> str:
    """
    Saves the current session state to Firestore and returns a unique ID.
    """
    if not firebase_admin._apps:
        raise Exception("Firebase Admin SDK not initialized. Cannot save session.")

    session_id = str(uuid.uuid4())

    # Firestore documents have a 1MB limit. Storing full document_content might exceed this.
    # For a real app, you'd store a reference to the document in cloud storage (e.g., Firebase Storage)
    # and only store its reference in Firestore.
    # For now, we'll store a truncated version of content to avoid immediate errors with large files.

    session_data = {
        "search_term": search_term,
        "document_content_snippet": document_content[:10000] + "..." if len(document_content) > 10000 else document_content, # Truncate content
        "highlighted_html": highlighted_html, # Store the full highlighted HTML
        "timestamp": firestore.SERVER_TIMESTAMP # Use server timestamp
    }

    try:
        db.collection("sessions").document(session_id).set(session_data)
        print(f"Session '{session_id}' saved to Firestore.")
        return session_id
    except Exception as e:
        print(f"Error saving session to Firestore: {e}")
        raise Exception(f"Failed to save session: {e}")

def load_session(session_id: str) -> dict | None:
    """
    Loads a session state from Firestore given its ID.
    """
    if not firebase_admin._apps:
        print("Firebase Admin SDK not initialized. Cannot load session.")
        return None

    try:
        doc_ref = db.collection("sessions").document(session_id)
        doc = doc_ref.get()
        if doc.exists:
            print(f"Session '{session_id}' loaded from Firestore.")
            return doc.to_dict()
        else:
            print(f"Session '{session_id}' not found in Firestore.")
            return None
    except Exception as e:
        print(f"Error loading session from Firestore: {e}")
        raise Exception(f"Failed to load session: {e}")