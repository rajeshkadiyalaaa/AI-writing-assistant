#!/bin/bash

# Install frontend dependencies and build
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

# Install Python dependencies
echo "Setting up Python environment..."
pip install -r requirements.txt

echo "Setup complete! Your project is ready for deployment." 