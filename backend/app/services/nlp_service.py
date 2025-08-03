# smartdoc-insight/backend/app/services/nlp_service.py
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from nltk.corpus import wordnet # New import for WordNet
from sentence_transformers import SentenceTransformer
# from openai import OpenAI # Commented out for free alternative
from flask import current_app # Still needed for app context, but not for API key directly
import numpy as np
import time
from .similarity_calculator import calculate_cosine_similarity

# --- NLTK Data Downloads (Run once on app startup or during setup) ---
def _download_nltk_data():
    """Downloads necessary NLTK data if not already present."""
    data_packages = ['punkt', 'stopwords', 'wordnet', 'omw-1.4']
    for package in data_packages:
        try:
            nltk.data.find(f'tokenizers/{package}' if package == 'punkt' else f'corpora/{package}')
            print(f"NLTK data '{package}' already downloaded.")
        except LookupError:
            print(f"Downloading NLTK data '{package}'...")
            nltk.download(package, quiet=True)
            print(f"NLTK data '{package}' downloaded.")
        except Exception as e:
            print(f"Error downloading NLTK data '{package}': {e}")

# Call the download function when the service file is imported
_download_nltk_data()

# Initialize NLTK components after ensuring data is downloaded
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))

# --- Sentence-BERT Model Loading ---
_sentence_bert_model = None

def _load_sentence_bert_model():
    """Loads the Sentence-BERT model. Lazy loading for efficiency."""
    global _sentence_bert_model
    if _sentence_bert_model is None:
        print("Loading Sentence-BERT model 'all-MiniLM-L6-v2'...")
        _sentence_bert_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Sentence-BERT model loaded.")
    return _sentence_bert_model

# --- Core NLP Functions ---

def preprocess_text(text: str) -> list[str]:
    """
    Performs basic text preprocessing: tokenization, lowercasing,
    stop word removal, and lemmatization.
    """
    if not text:
        return []
    
    tokens = word_tokenize(text.lower())
    filtered_tokens = [
        lemmatizer.lemmatize(word) for word in tokens
        if word.isalnum() and word not in stop_words
    ]
    return filtered_tokens

def get_semantic_matches(document_text: str, search_term: str, similarity_threshold: float = 0.4) -> list[str]: # Lowered threshold
    """
    Finds semantically related words in the document using Sentence-BERT.

    Args:
        document_text (str): The full text of the document.
        search_term (str): The word to find semantic matches for.
        similarity_threshold (float): Minimum cosine similarity to consider a match.

    Returns:
        list[str]: A list of unique semantically matching words found in the document.
    """
    model = _load_sentence_bert_model()
    if model is None:
        print("Sentence-BERT model not loaded, cannot find semantic matches.")
        return []

    document_words_raw = [word for word in word_tokenize(document_text.lower()) if word.isalnum() and len(word) > 1]
    document_words_unique = list(set(document_words_raw))
    
    if not document_words_unique:
        return []

    search_embedding = model.encode(search_term)

    semantic_matches = []
    for doc_word in document_words_unique:
        if doc_word == search_term.lower():
            continue
            
        doc_word_embedding = model.encode(doc_word)
        similarity = calculate_cosine_similarity(search_embedding, doc_word_embedding)
        
        if similarity >= similarity_threshold:
            semantic_matches.append(doc_word)

    return semantic_matches

def get_definitions(word: str) -> str:
    """
    Fetches the definition of a word using NLTK's WordNet.
    """
    print(f"Fetching definition for '{word}' using WordNet...")
    synsets = wordnet.synsets(word.lower())
    if synsets:
        # Return the definition of the first (most common) synset
        return synsets[0].definition()
    return f"Definition for '{word}' not found via WordNet."

def get_suggested_words(search_term: str, context_text: str, num_suggestions: int = 5) -> list[str]:
    """
    Suggests semantically related terms using Sentence-BERT by finding similar words
    within the document context, excluding exact and semantic matches.
    """
    model = _load_sentence_bert_model()
    if model is None:
        print("Sentence-BERT model not loaded, cannot suggest words.")
        return []

    document_words_raw = [word for word in word_tokenize(context_text.lower()) if word.isalnum() and len(word) > 1]
    document_words_unique = list(set(document_words_raw))

    if not document_words_unique:
        return []

    search_embedding = model.encode(search_term)
    
    suggestions_with_similarity = []
    for doc_word in document_words_unique:
        if doc_word == search_term.lower():
            continue
        
        doc_word_embedding = model.encode(doc_word)
        similarity = calculate_cosine_similarity(search_embedding, doc_word_embedding)
        suggestions_with_similarity.append((doc_word, similarity))

    # Sort by similarity in descending order and filter out low-similarity suggestions
    suggestions_with_similarity = [
        (word, sim) for word, sim in suggestions_with_similarity if sim >= 0.25 # Lowered threshold for suggestions
    ]
    suggestions_with_similarity.sort(key=lambda x: x[1], reverse=True)

    final_suggestions = []
    seen_words = {search_term.lower()}
    
    for word, _ in suggestions_with_similarity:
        if word not in seen_words:
            final_suggestions.append(word)
            seen_words.add(word)
        if len(final_suggestions) >= num_suggestions:
            break
            
    return final_suggestions[:num_suggestions]