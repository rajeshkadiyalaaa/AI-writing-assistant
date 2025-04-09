#!/bin/bash
set -e

echo "======================"
echo "Render Deployment Setup"
echo "======================"

# Install root dependencies
echo "Installing root dependencies..."
npm ci

# Frontend setup
echo "Setting up frontend..."
cd frontend
npm ci
npm run build
cd ..

# Backend setup
echo "Setting up backend..."
cd backend
rm -rf node_modules
npm ci
echo "Explicitly installing critical dependencies..."
npm install express cors body-parser dotenv node-fetch --save

# List installed modules to verify
echo "Installed node_modules in backend:"
ls -la node_modules | grep express

# Check for express
if [ -d "node_modules/express" ]; then
  echo "Express is installed correctly!"
else
  echo "ERROR: Express module is missing!"
  echo "Attempting emergency installation..."
  npm install express --save
fi

echo "Deployment setup complete!" 