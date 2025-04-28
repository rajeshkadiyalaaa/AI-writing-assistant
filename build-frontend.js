const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the frontend directory path
const frontendDir = path.join(__dirname, 'frontend');
const buildDir = path.join(frontendDir, 'build');

console.log('Building frontend...');
console.log('Frontend directory:', frontendDir);

// Check if the frontend directory exists
if (!fs.existsSync(frontendDir)) {
  console.error('ERROR: Frontend directory not found at', frontendDir);
  process.exit(1);
}

// Create the build directory if it doesn't exist
if (!fs.existsSync(buildDir)) {
  console.log('Creating build directory at', buildDir);
  fs.mkdirSync(buildDir, { recursive: true });
}

try {
  // Change directory to frontend
  process.chdir(frontendDir);
  console.log('Current directory:', process.cwd());
  
  // Install dependencies
  console.log('Installing frontend dependencies...');
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  
  // Build the frontend
  console.log('Building frontend...');
  execSync('CI=false npm run build', { stdio: 'inherit' });
  
  // Verify build was successful
  if (fs.existsSync(path.join(buildDir, 'index.html'))) {
    console.log('Frontend build successful!');
    console.log('Build directory contents:');
    const files = fs.readdirSync(buildDir);
    files.forEach(file => {
      console.log(' -', file);
    });
    process.exit(0);
  } else {
    console.error('ERROR: Build failed, index.html not found in build directory');
    createFallbackPage();
  }
} catch (error) {
  console.error('Build error:', error.message);
  createFallbackPage();
}

// Function to create a fallback HTML page
function createFallbackPage() {
  console.log('Creating fallback index.html...');
  const fallbackHtml = `
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
  `;
  
  fs.writeFileSync(path.join(buildDir, 'index.html'), fallbackHtml);
  console.log('Fallback index.html created successfully');
  process.exit(1);
} 