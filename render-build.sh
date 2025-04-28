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

cd ..

# Ensure frontend/build directory exists
echo "Ensuring frontend build directory exists..."
mkdir -p frontend/build

# Install frontend dependencies and build
echo "Installing frontend dependencies..."
cd frontend
echo "Current directory (should be frontend): $(pwd)"
ls -la
npm install --legacy-peer-deps

echo "Building frontend..."
CI=false npm run build

# Verify build was successful
if [ -f "build/index.html" ]; then
  echo "Frontend build successful!"
  ls -la build
else
  echo "ERROR: Frontend build failed, index.html not found!"
  echo "Creating a minimal index.html as fallback..."
  mkdir -p build
  cat > build/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Writing Assistant</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
    h1 { color: #333; }
    .message { background: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; }
    .btn { display: inline-block; background: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>AI Writing Assistant</h1>
  <div class="message">
    <p>The application is running, but there was an issue building the frontend.</p>
    <p>The API endpoints are available at <code>/api/...</code></p>
  </div>
  <p>
    <a href="/api/health" class="btn">Check API Health</a>
  </p>
</body>
</html>
EOF
  echo "Created fallback index.html"
fi

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
  
  // Check if frontend/build directory exists
  const buildPath = path.join(__dirname, '../frontend/build');
  const indexPath = path.join(buildPath, 'index.html');
  
  console.log('Checking frontend build directory:', buildPath);
  console.log('Directory exists:', require('fs').existsSync(buildPath));
  
  if (require('fs').existsSync(indexPath)) {
    console.log('index.html exists at:', indexPath);
  } else {
    console.log('WARNING: index.html not found at:', indexPath);
  }
  
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