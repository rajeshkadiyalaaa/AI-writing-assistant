#!/bin/bash
set -e

echo "Starting Vercel deployment build script..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install and build frontend
echo "Setting up frontend..."
cd frontend
npm install
npm run build
cd ..

# Install backend dependencies 
echo "Setting up backend..."
cd backend
npm install
cd ..

# Copy .env for production if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env || echo "No .env.example file found, skipping"
fi

echo "Build script completed successfully" 