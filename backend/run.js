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

// Check if node_modules exists and express is available
try {
  require('express');
  console.log('Express module is already available');
} catch (error) {
  console.log('Express module not available, installing dependencies...');
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(currentDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('node_modules directory not found, creating it...');
    try {
      fs.mkdirSync(nodeModulesPath, { recursive: true });
    } catch (err) {
      console.log('Error creating node_modules directory:', err.message);
      // Continue anyway
    }
  }
  
  // Install dependencies
  try {
    console.log('Installing dependencies with npm...');
    execSync('npm install --no-audit --no-fund', { cwd: currentDir, stdio: 'inherit' });
    console.log('Dependencies installed successfully');
  } catch (error) {
    console.error('ERROR installing dependencies:', error.message);
    
    // Try installing just the essential packages
    console.log('Trying to install essential packages directly...');
    try {
      execSync('npm install express cors body-parser dotenv node-fetch', { 
        cwd: currentDir, 
        stdio: 'inherit' 
      });
      console.log('Essential packages installed');
    } catch (err) {
      console.error('Failed to install essential packages:', err.message);
    }
  }
}

// Verify express is available now
try {
  require('express');
  console.log('Express module is now available');
} catch (error) {
  console.error('EXPRESS MODULE STILL NOT AVAILABLE AFTER INSTALLATION ATTEMPTS!');
  console.error('Error details:', error.message);
  process.exit(1);
}

// Make sure we explicitly set a PORT
if (!process.env.PORT) {
  console.log('No PORT environment variable found, setting to default 10000');
  process.env.PORT = process.env.PORT || 10000;
}

// Log environment for debugging
console.log('Environment variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);

// Run the server
console.log('Starting server on port', process.env.PORT, '...');
require('./server.js'); 