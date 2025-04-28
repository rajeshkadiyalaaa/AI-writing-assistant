#!/bin/bash
set -e

echo "===== NPM Debug Script ====="
echo "Current directory: $(pwd)"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

echo "===== Backend Directory ====="
cd backend
echo "Backend directory: $(pwd)"
echo "Checking if package.json exists:"
if [ -f package.json ]; then
  echo "package.json exists"
  cat package.json
else
  echo "package.json does not exist!"
fi

echo "Checking if node_modules exists:"
if [ -d node_modules ]; then
  echo "node_modules exists"
  echo "Checking if express exists:"
  if [ -d node_modules/express ]; then
    echo "express module exists"
  else
    echo "express module does not exist!"
  fi
else
  echo "node_modules does not exist!"
fi

echo "Installing express directly:"
npm install express --no-save

echo "Trying to require express:"
node -e "try { require('express'); console.log('Express loaded successfully!'); } catch(e) { console.error('Error loading express:', e); }"

echo "===== Module Resolution Paths ====="
node -e "console.log('Module paths:', module.paths)"

echo "===== Environment Variables ====="
node -e "console.log('NODE_PATH:', process.env.NODE_PATH)"
node -e "console.log('PATH:', process.env.PATH)"

echo "===== Debug Complete =====" 