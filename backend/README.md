# SmartDoc Insight Backend

This directory contains the Flask API for the SmartDoc Insight project.

## Features

- Document parsing (.docx, .pdf)
- AI-powered semantic search (using Sentence-BERT)
- Word definitions (using NLTK WordNet)
- AI-suggested related words (using Sentence-BERT)
- CORS enabled for frontend communication

## Setup

1.  **Navigate to the `backend` directory:**
    `cd smartdoc-insight/backend`

2.  **Create a Python virtual environment:**
    `python -m venv venv`

3.  **Activate the virtual environment:**
    * Windows: `.\venv\Scripts\activate`
    * macOS/Linux: `source venv/bin/activate`

4.  **Install dependencies:**
    `pip install -r requirements.txt`

5.  **Create a `.env` file** in the `backend` directory and add your `SECRET_KEY` (and `OPENAI_API_KEY` if you plan to use OpenAI in the future):
    ```
    SECRET_KEY=your_super_secret_key_here
    OPENAI_API_KEY=your_openai_api_key_here_if_needed
    ```

## Running the Application

To run the development server:

```bash
python run.py