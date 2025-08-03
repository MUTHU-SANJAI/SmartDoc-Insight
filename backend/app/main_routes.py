# smartdoc-insight/backend/app/main_routes.py
from flask import Blueprint, jsonify, request, send_file, url_for # Added url_for for shareable link generation
from .services.document_parser import parse_document
from .services.nlp_service import preprocess_text, get_semantic_matches, get_definitions, get_suggested_words
from .services.pdf_generator import generate_highlighted_pdf
from .services.session_manager import save_session, load_session # New import for session management
import io

bp = Blueprint('main', __name__)

@bp.route('/status')
def status():
    """
    A simple status endpoint to check if the backend is running.
    """
    return jsonify({"status": "Backend is running!"}), 200

@bp.route('/upload', methods=['POST'])
def upload_document():
    """
    Handles document uploads, parses them, and returns the extracted text.
    Expects a file under the 'file' key in the form data.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        try:
            file_stream = io.BytesIO(file.read())
            document_text = parse_document(file_stream, file.filename)
            return jsonify({"message": "File uploaded and parsed successfully", "content": document_text}), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": f"Failed to process file: {str(e)}"}), 500
    return jsonify({"error": "Something went wrong with the file upload."}), 500

@bp.route('/search', methods=['POST'])
def search_document():
    """
    Performs search and highlighting based on a search term and document content.
    Uses NLP services to find exact matches, semantic matches, and suggestions.
    """
    data = request.get_json()
    search_term = data.get('searchTerm')
    document_content = data.get('documentContent')

    if not search_term or not document_content:
        return jsonify({"error": "Missing 'searchTerm' or 'documentContent' in request"}), 400

    # Get semantic matches (synonyms) using Sentence-BERT
    semantic_matches = get_semantic_matches(document_content, search_term) # Threshold is set in nlp_service.py

    # Get suggested related words using Sentence-BERT
    suggested_words = get_suggested_words(search_term, document_content)

    return jsonify({
        "message": "Search processed successfully",
        "searchTerm": search_term,
        "semanticMatches": semantic_matches,
        "suggestedWords": suggested_words
    }), 200

@bp.route('/definitions', methods=['POST'])
def get_word_definition():
    """
    Fetches the definition for a single word using NLTK's WordNet.
    """
    data = request.get_json()
    word = data.get('word')
    if not word:
        return jsonify({"error": "Missing 'word' in request body"}), 400
    
    definition = get_definitions(word)
    return jsonify({"word": word, "definition": definition}), 200

@bp.route('/preprocess', methods=['POST'])
def preprocess():
    """
    Endpoint to test the NLTK preprocessing service.
    """
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "Missing 'text' in request body"}), 400
    processed_tokens = preprocess_text(data['text'])
    return jsonify({"processed_text": processed_tokens}), 200

@bp.route('/download_pdf', methods=['POST'])
def download_pdf():
    """
    Receives highlighted HTML content and returns it as a PDF file.
    """
    data = request.get_json()
    highlighted_html = data.get('highlightedHtml')
    filename = data.get('filename', 'highlighted_document.pdf')

    if not highlighted_html:
        return jsonify({"error": "No highlighted HTML content provided"}), 400

    try:
        pdf_bytes = generate_highlighted_pdf(highlighted_html, filename)
        # Use send_file to send the PDF bytes as a file download
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except NotImplementedError:
        return jsonify({"error": "PDF generation is not implemented on the server."}), 501
    except Exception as e:
        print(f"Error generating PDF: {e}")
        return jsonify({"error": f"Failed to generate PDF: {str(e)}"}), 500

@bp.route('/session/save', methods=['POST'])
def save_session_route():
    """
    Saves the current session state to Firestore and returns a unique ID and shareable link.
    """
    data = request.get_json()
    search_term = data.get('searchTerm')
    document_content = data.get('documentContent')
    highlighted_html = data.get('highlightedHtml') # The full HTML with highlights

    if not all([search_term, document_content, highlighted_html]):
        return jsonify({"error": "Missing session data (searchTerm, documentContent, highlightedHtml)"}), 400

    try:
        session_id = save_session(search_term, document_content, highlighted_html)
        # Construct the shareable link using the frontend's base URL
        # In a real deployed app, this would be your actual frontend domain (e.g., smartdoc.ai)
        shareable_link = f"http://localhost:5173/session/{session_id}" 
        return jsonify({"message": "Session saved successfully", "sessionId": session_id, "shareableLink": shareable_link}), 200
    except Exception as e:
        print(f"Error in save_session_route: {e}")
        return jsonify({"error": f"Failed to save session: {str(e)}"}), 500

@bp.route('/session/<session_id>', methods=['GET'])
def load_session_route(session_id):
    """
    Loads a session state from Firestore given its ID.
    This endpoint would primarily be called by the frontend to reconstruct the session.
    """
    try:
        session_data = load_session(session_id)
        if session_data:
            return jsonify(session_data), 200
        else:
            return jsonify({"error": "Session not found"}), 404
    except Exception as e:
        print(f"Error in load_session_route: {e}")
        return jsonify({"error": f"Failed to load session: {str(e)}"}), 500