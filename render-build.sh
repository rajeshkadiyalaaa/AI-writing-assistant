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

# Install root dependencies (including backend dependencies)
echo "Installing root Node.js dependencies..."
npm install --production=false
echo "Root node_modules contents:"
ls -la node_modules | grep -E 'express|cors|body-parser|dotenv|node-fetch' || echo "No backend modules found at root"

# Copy node_modules to the backend directory to ensure backend can find modules
echo "Creating backend node_modules symlink..."
mkdir -p backend/node_modules
# Create symlinks for backend dependencies
ln -sf ../../node_modules/express backend/node_modules/express
ln -sf ../../node_modules/cors backend/node_modules/cors
ln -sf ../../node_modules/body-parser backend/node_modules/body-parser
ln -sf ../../node_modules/dotenv backend/node_modules/dotenv
ln -sf ../../node_modules/node-fetch backend/node_modules/node-fetch

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install --production=false
cd ..

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

# Verify dependencies are installed
echo "Verifying backend dependencies..."
if [ -d "node_modules/express" ]; then
    echo "Express module found in root node_modules."
else
    echo "ERROR: Express module not found in root node_modules!"
    exit 1
fi

echo "Verifying backend node_modules symlinks..."
ls -la backend/node_modules || echo "Backend node_modules not found or empty"

echo "Build completed successfully!" 