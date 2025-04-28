#!/bin/bash
set -e

echo "Starting Vercel deployment build script..."

# Print environment for debugging
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install and build frontend
echo "Setting up frontend..."
cd frontend
npm install --production=false
echo "Building frontend..."
npm run build
cd ..

# Install backend dependencies 
echo "Setting up backend..."
cd backend
npm install --production=false
cd ..

# Copy .env for production if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env || echo "No .env.example file found, skipping"
fi

# Verify the build output
echo "Verifying build output..."
if [ -d "frontend/build" ]; then
    echo "Frontend build directory exists. Contents:"
    ls -la frontend/build
else
    echo "ERROR: frontend/build directory does not exist!"
    exit 1
fi

echo "Build script completed successfully" 