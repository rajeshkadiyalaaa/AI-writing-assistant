#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Install node dependencies
echo "Installing Node.js dependencies..."
npm run install-all

# Build frontend
echo "Building frontend..."
npm run build

echo "Build completed successfully!" 