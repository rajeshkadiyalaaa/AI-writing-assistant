// This script ensures dependencies are installed before running the server
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get current directory
const currentDir = __dirname;
console.log('Current directory:', currentDir);

// Check if we have a package.json
const packageJsonPath = path.join(currentDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log('Package.json found');
} else {
  console.error('ERROR: package.json not found!');
  process.exit(1);
}

// Check if node_modules exists
const nodeModulesPath = path.join(currentDir, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('node_modules directory found');
} else {
  console.log('node_modules not found, installing dependencies...');
  try {
    execSync('npm install', { cwd: currentDir, stdio: 'inherit' });
    console.log('Dependencies installed successfully');
  } catch (error) {
    console.error('ERROR installing dependencies:', error.message);
    process.exit(1);
  }
}

// Check for express module specifically
const expressPath = path.join(nodeModulesPath, 'express');
if (fs.existsSync(expressPath)) {
  console.log('Express module found');
} else {
  console.log('Express module not found, installing express specifically...');
  try {
    execSync('npm install express', { cwd: currentDir, stdio: 'inherit' });
    console.log('Express installed successfully');
  } catch (error) {
    console.error('ERROR installing express:', error.message);
    process.exit(1);
  }
}

// Run the server
console.log('Starting server...');
require('./server.js'); 