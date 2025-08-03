# backend/Dockerfile
# Use an official Python runtime as a parent image
FROM python:3.9-slim-buster

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Download NLTK data (important for local NLP models)
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('omw-1.4')"

# Expose the port the app runs on
EXPOSE 5000

# Define environment variable for Flask
ENV FLASK_APP=run.py

# Run the application (using Gunicorn for production)
# CMD ["gunicorn", "wsgi:app", "-w", "4", "-b", "0.0.0.0:5000"]
# For development, you might use:
CMD ["python", "run.py"]