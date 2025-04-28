#!/usr/bin/env bash
# Exit on error
set -o errexit

# Print system information
echo "=============== SYSTEM INFO ==============="
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
python --version || echo "Python not found"
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"
echo "==========================================="

# Ensure Python is available and properly configured
echo "Setting up Python environment..."
python -m pip install --upgrade pip
python -m pip install virtualenv
python -m virtualenv venv || echo "Virtualenv creation failed, continuing with system Python"
source venv/bin/activate || echo "Virtualenv activation failed, continuing with system Python"

# Install python dependencies
echo "Installing Python dependencies..."
python -m pip install --no-cache-dir -r requirements.txt

# Install node dependencies
echo "Installing Node.js dependencies..."
npm run install-all

# Build frontend
echo "Building frontend..."
npm run build

# Verify the build
echo "Verifying build output..."
if [ -d "frontend/build" ]; then
    echo "Frontend build directory exists. Contents:"
    ls -la frontend/build
else
    echo "WARNING: frontend/build directory does not exist!"
fi

echo "Build completed successfully!" 