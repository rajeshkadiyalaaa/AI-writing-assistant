#!/bin/bash
set -e

# Print system information
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Python version: $(python -v)"
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"

# Setup Python environment
echo "Setting up Python environment..."
python -m pip install --upgrade pip
pip install -r requirements.txt

# Install root dependencies first
echo "Installing root dependencies..."
npm install

# Install backend dependencies directly
echo "Installing backend dependencies..."
cd backend
# Don't use npm init -y as it might overwrite existing package.json
npm install

# Verify backend packages are installed
echo "Verifying backend packages..."
if [ -d "node_modules/express" ]; then
  echo "Express is installed in backend directory"
else
  echo "Express is NOT installed in backend directory, installing again..."
  npm install express cors body-parser dotenv node-fetch --no-optional
fi

# List installed packages for debugging
echo "Installed backend packages:"
ls -la node_modules | grep express
ls -la node_modules | grep cors
ls -la node_modules | grep body-parser
ls -la node_modules | grep dotenv
ls -la node_modules | grep node-fetch

# Verify backend directory setup
echo "Backend directory structure:"
ls -la

cd ..

# Install frontend dependencies and build
echo "Installing frontend dependencies..."
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

# Create a test server script to verify backend can start
echo "Creating test server script..."
cd backend
cat > test-server.js << 'EOF'
console.log("Testing server initialization...");
try {
  const express = require('express');
  const cors = require('cors');
  const bodyParser = require('body-parser');
  require('dotenv').config();
  const fetch = require('node-fetch');
  const path = require('path');
  
  const app = express();
  console.log("All modules loaded successfully!");
  process.exit(0);
} catch (error) {
  console.error("Error loading modules:", error);
  process.exit(1);
}
EOF

# Test if server can start
echo "Testing server initialization..."
node test-server.js || {
  echo "Server initialization failed, checking node_modules..."
  ls -la node_modules
  echo "Express module location:"
  find node_modules -name "express" -type d
  exit 1
}
cd ..

echo "Build completed successfully!" 