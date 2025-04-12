#!/bin/bash

# Install dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Build the frontend
npm run build

# Return to root directory
cd ..

# Install backend dependencies 
cd backend
npm install

echo "Vercel build script completed successfully" 