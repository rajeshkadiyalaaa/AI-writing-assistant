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

# Install frontend dependencies and build
echo "Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd ..

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm init -y
npm install express cors body-parser dotenv node-fetch
npm list express cors body-parser dotenv node-fetch
cd ..

# Verify installations
echo "Verifying backend installation..."
cd backend
NODE_PATH=$(npm root) node -e "console.log('Express loaded:', require('express') !== undefined)"
NODE_PATH=$(npm root) node -e "console.log('CORS loaded:', require('cors') !== undefined)"
NODE_PATH=$(npm root) node -e "console.log('body-parser loaded:', require('body-parser') !== undefined)"
NODE_PATH=$(npm root) node -e "console.log('dotenv loaded:', require('dotenv') !== undefined)"
NODE_PATH=$(npm root) node -e "console.log('node-fetch loaded:', require('node-fetch') !== undefined)"
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
NODE_PATH=$(npm root) node test-server.js
cd ..

echo "Build completed successfully!" 