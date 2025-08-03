# smartdoc-insight/backend/app/services/similarity_calculator.py
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def calculate_cosine_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
    """
    Calculates the cosine similarity between two given embeddings.

    Args:
        embedding1 (np.ndarray): The first embedding vector.
        embedding2 (np.ndarray): The second embedding vector.

    Returns:
        float: The cosine similarity score (between -1 and 1).
    """
    # Reshape embeddings to 2D arrays if they are 1D, as cosine_similarity expects 2D
    if embedding1.ndim == 1:
        embedding1 = embedding1.reshape(1, -1)
    if embedding2.ndim == 1:
        embedding2 = embedding2.reshape(1, -1)

    return cosine_similarity(embedding1, embedding2)[0][0]