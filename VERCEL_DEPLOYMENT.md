# Vercel Deployment Troubleshooting Guide

This guide provides solutions to common issues encountered when deploying the AI Writing Assistant to Vercel.

## Recommended Deployment Process

For this monorepo structure with React frontend and Node.js/Python backend, follow these steps:

1. **Set up environment variables in Vercel**:
   - `OPENROUTER_API_KEY` - Your OpenRouter API key
   - `NODE_ENV=production` - Set environment to production
   - `PORT=3000` - Specify port (Vercel will override this, but good to have)

2. **Deploy via Vercel Dashboard**:
   - Connect your GitHub repository
   - Set Framework Preset to "Other"
   - Set Root Directory to `/` (root of repository)
   - Set Build Command to `npm run vercel-build`
   - Set Output Directory to `frontend/build`

## Common Issues and Solutions

### 404 Errors

If you're encountering 404 errors when accessing your deployed application:

1. **Build output issue**: 
   - Verify frontend is built to `frontend/build/` directory
   - Check if backend server.js is properly accessed

2. **Vercel monorepo handling**:
   - Your project structure separates frontend and backend
   - Make sure `vercel.json` properly handles this structure
   - The `"handle": "filesystem"` directive is crucial

3. **Python script execution**:
   - Vercel may have issues with Python script execution
   - Check logs for Python-related errors
   - Consider using a serverless function approach for Python

### Fix for 404 NOT_FOUND Errors

For the specific error `404: NOT_FOUND`, try these solutions:

1. **Direct route to backend**:
   ```json
   {
     "src": "/api/(.*)",
     "dest": "backend/server.js"
   }
   ```

2. **Filesystem handling for static assets**:
   ```json
   {
     "handle": "filesystem"
   }
   ```

3. **Generic route for all static assets**:
   ```json
   {
     "src": "/(.+\\.[a-zA-Z0-9]{2,}$)",
     "dest": "frontend/build/$1"
   }
   ```

4. **Fallback to index.html**:
   ```json
   {
     "src": "/(.*)",
     "dest": "frontend/build/index.html"
   }
   ```

## Manual Deployment with Vercel CLI

For more control, use the Vercel CLI:

1. Install Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Login to Vercel:
   ```
   vercel login
   ```

3. Deploy in development mode first to test:
   ```
   vercel
   ```

4. Deploy to production:
   ```
   vercel --prod
   ```

## Alternative Deployment Method (Build Locally)

If issues persist, try building locally and deploying the build output:

1. Run build locally:
   ```
   bash vercel.sh
   ```

2. Deploy using Vercel CLI:
   ```
   vercel frontend/build --prod
   ```

3. Deploy backend separately:
   ```
   cd backend
   vercel --prod
   ```

Then update your frontend API calls to point to the backend deployment URL.

## Testing Your Deployment

After deploying, test these URLs:

1. Main application: `https://your-deployment-url.vercel.app/`
2. Health check: `https://your-deployment-url.vercel.app/api/health`
3. Static assets: `https://your-deployment-url.vercel.app/static/css/main.css`

## Python Serverless Functions in Vercel

For Python-based serverless functions, consider:

1. Creating standalone API endpoints that don't rely on shared Python scripts
2. Using Vercel's Python runtime for individual functions
3. Converting Python logic to Node.js where possible

## Contact Support

If you continue to experience issues, contact support with:
- Your Vercel project URL
- The specific error messages
- Screenshots of your Vercel dashboard build logs 