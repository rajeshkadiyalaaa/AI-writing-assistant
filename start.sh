#!/bin/bash
set -e

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Log environment details
echo "Starting server with:"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DEBUG: $DEBUG"
echo "API Key set: " $(if [ -n "$OPENROUTER_API_KEY" ]; then echo "Yes"; else echo "No"; fi)

# Make sure NLTK data is downloaded
echo "Verifying NLTK data..."
python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('stopwords', quiet=True)" || echo "NLTK data verification failed but continuing..."

# Start the backend server
echo "Starting backend server..."
cd backend && npm start 