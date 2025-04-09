#!/usr/bin/env node

// This script checks for required dependencies and starts the server
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting dependency verification...');

// List of critical dependencies
const criticalDependencies = [
  'express',
  'cors',
  'body-parser',
  'dotenv',
  'node-fetch'
];

let missingDependencies = [];

// Check for each dependency
criticalDependencies.forEach(dep => {
  try {
    // Try to require the dependency
    require.resolve(dep);
    console.log(`✓ ${dep} is installed`);
  } catch (e) {
    console.log(`✗ ${dep} is missing`);
    missingDependencies.push(dep);
  }
});

// Install missing dependencies if any
if (missingDependencies.length > 0) {
  console.log(`Installing missing dependencies: ${missingDependencies.join(', ')}`);
  try {
    execSync(`npm install ${missingDependencies.join(' ')} --save`, { stdio: 'inherit' });
    console.log('Dependencies installed successfully');
  } catch (error) {
    console.error('Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Start the server
console.log('Starting server...');
require('./server.js'); 