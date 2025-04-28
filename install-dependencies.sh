#!/bin/bash
set -e

echo "Installing dependencies for AI Writing Assistant"

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
npm list express # Verify express is installed
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "All dependencies installed successfully!" 