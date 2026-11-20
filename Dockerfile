# ==============================================================================
# CogniLoop - Dockerfile for Google Cloud Run
# ==============================================================================
# Base image: Official lightweight Python 3.11 slim
FROM python:3.11-slim

# Prevent Python from buffering stdout/stderr and writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    HOST=0.0.0.0

# Set working directory inside container
WORKDIR /app

# Copy application components
COPY database/ ./database/
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY test_pipeline.py ./
COPY README.md ./

# Run full integrity test suite during build to guarantee zero-defect deployment
RUN python test_pipeline.py

# Cloud Run dynamic HTTP port
EXPOSE 8080

# Launch CogniLoop server
CMD ["python", "backend/server.py"]
