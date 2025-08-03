# smartdoc-insight/backend/app/services/document_parser.py
from docx import Document
from pdfminer.high_level import extract_text as pdf_extract_text
import io

def parse_document(file_stream: io.BytesIO, filename: str) -> str:
    """
    Parses a document stream and returns its text content.
    Supports .docx and .pdf files.

    Args:
        file_stream (io.BytesIO): The file content as a byte stream.
        filename (str): The original filename, used to determine the file type.

    Returns:
        str: The extracted text content of the document.

    Raises:
        ValueError: If the file type is unsupported.
    """
    file_extension = filename.split('.')[-1].lower()

    if file_extension == 'docx':
        return _parse_docx(file_stream)
    elif file_extension == 'pdf':
        return _parse_pdf(file_stream)
    else:
        raise ValueError(f"Unsupported file type: .{file_extension}. Only .docx and .pdf are supported.")

def _parse_docx(file_stream: io.BytesIO) -> str:
    """
    Parses a .docx file stream and extracts all text.
    """
    document = Document(file_stream)
    full_text = []
    for para in document.paragraphs:
        full_text.append(para.text)
    return '\n'.join(full_text)

def _parse_pdf(file_stream: io.BytesIO) -> str:
    """
    Parses a .pdf file stream and extracts all text using pdfminer.six.
    """
    # pdfminer.six's extract_text function expects a file-like object
    return pdf_extract_text(file_stream)