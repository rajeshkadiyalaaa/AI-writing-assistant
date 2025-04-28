#!/bin/bash
set -e

echo "Starting build process..."

# Check Node.js and npm versions
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Check Python version
echo "Python version: $(python --version || python3 --version)"
echo "pip version: $(pip --version || pip3 --version)"

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend && npm install && cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt || pip3 install -r requirements.txt

# Download NLTK data
echo "Downloading NLTK data..."
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')" || python3 -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"

# Build frontend
echo "Building frontend..."
npm run build

echo "Build process completed!" 