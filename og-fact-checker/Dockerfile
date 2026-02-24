# Dockerfile for Railway deployment
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY factcheck.py .
COPY api_server.py .
COPY .env.example .

# Expose port
EXPOSE 5000

# Run the API server
CMD ["python", "api_server.py"]
