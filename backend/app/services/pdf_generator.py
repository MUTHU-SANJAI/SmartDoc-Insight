# backend/app/services/pdf_generator.py
from xhtml2pdf import pisa
import io
import os

def generate_highlighted_pdf(html_content: str, filename: str = "highlighted_document.pdf") -> bytes:
    """
    Generates a PDF from HTML content, preserving highlights.
    Uses xhtml2pdf for conversion.

    Args:
        html_content (str): The HTML string representing the highlighted document.
                            This HTML should include the styling for highlights.
        filename (str): The desired filename for the output PDF.

    Returns:
        bytes: The binary content of the generated PDF file.

    Raises:
        Exception: If PDF generation fails.
    """
    result_file = io.BytesIO()

    # Define basic HTML template with more comprehensive inline styles
    # These styles are critical for xhtml2pdf to render correctly,
    # as it doesn't process external Tailwind CSS files.
    pdf_html_template = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Highlighted Document</title>
        <style>
            /* Basic resets for PDF */
            body {{
                font-family: sans-serif;
                margin: 20px;
                line-height: 1.5; /* Default line height */
                color: #1F2937; /* Tailwind gray-800 equivalent */
            }}
            
            /* Tailwind color equivalents for highlights */
            .bg-yellow-300 {{ background-color: #FDE047; }} /* Tailwind yellow-300 */
            .bg-green-300 {{ background-color: #86EFAC; }} /* Tailwind green-300 */
            
            /* Tailwind spacing & border for highlights */
            .rounded-md {{ border-radius: 0.375rem; }}
            .px-1 {{ padding-left: 0.25rem; padding-right: 0.25rem; }}
            
            /* Ensure text wrapping and line breaks are preserved */
            .whitespace-pre-wrap {{ white-space: pre-wrap; }}
            
            /* Font size and line height from frontend's document area */
            .text-lg {{ font-size: 1.125rem; }}
            .leading-relaxed {{ line-height: 1.625; }}

            /* Ensure spans are inline and do not break layout */
            span {{ display: inline; }}

            /* Optional: Add styles for the document container if needed */
            .document-container {{
                background-color: #FFFFFF; /* white */
                padding: 1.5rem; /* p-6 */
                border-radius: 0.75rem; /* rounded-xl */
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* shadow-xl */
                border: 1px solid #E5E7EB; /* border border-gray-200 */
                font-size: 1.125rem; /* text-lg */
                line-height: 1.625; /* leading-relaxed */
                white-space: pre-wrap; /* whitespace-pre-wrap */
                /* max-height and overflow are for screen display, not directly for PDF layout */
            }}
        </style>
    </head>
    <body>
        <div class="document-container">
            {html_content}
        </div>
    </body>
    </html>
    """

    # Convert HTML to PDF
    pisa_status = pisa.CreatePDF(
        pdf_html_template,  # the HTML to convert
        dest=result_file     # file handle to receive result
    )

    if pisa_status.err:
        print(f"PDF generation error: {pisa_status.err}")
        raise Exception("PDF generation failed.")

    return result_file.getvalue()