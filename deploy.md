# Deployment Guide for AI Writing Assistant

This guide provides step-by-step instructions for deploying the AI Writing Assistant application to various platforms.

## Prerequisites

- Node.js v14.x or higher
- npm v6.x or higher
- A GitHub account
- An OpenRouter API key (get one at https://openrouter.ai)

## Common Deployment Steps

Regardless of the platform, you'll need to:

1. **Set up your environment variables**:
   - Copy `.env.example` to `.env` in the root directory
   - Set your `OPENROUTER_API_KEY` value
   - Configure other variables as needed

2. **Install dependencies**:
   ```
   npm run install-all
   ```

3. **Build the frontend**:
   ```
   npm run build
   ```

## Deploying to Render.com (Recommended)

Render offers a straightforward deployment process and includes a free tier.

1. **Create a Render account**:
   - Go to [Render.com](https://render.com/) and sign up

2. **Create a new Web Service**:
   - Click the "New +" button and select "Web Service"
   - Connect your GitHub repository

3. **Configure the service**:
   - **Name**: Choose a name for your service
   - **Environment**: Node
   - **Build Command**: `npm install && cd frontend && npm install && npm run build && cd ../backend && npm install`
   - **Start Command**: `cd backend && npm start`

4. **Set environment variables**:
   - Add all variables from your `.env` file, especially `OPENROUTER_API_KEY`
   - Set `NODE_ENV` to `production`

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for the build and deployment to complete

## Deploying to Heroku

1. **Install the Heroku CLI**:
   - Follow [Heroku's installation guide](https://devcenter.heroku.com/articles/heroku-cli)

2. **Login to Heroku**:
   ```
   heroku login
   ```

3. **Create a new Heroku app**:
   ```
   heroku create ai-writing-assistant
   ```

4. **Add a Procfile to the root**:
   ```
   echo "web: cd backend && npm start" > Procfile
   ```

5. **Set environment variables**:
   ```
   heroku config:set OPENROUTER_API_KEY=your_key_here
   heroku config:set NODE_ENV=production
   ```

6. **Deploy to Heroku**:
   ```
   git push heroku main
   ```

## Deploying to Digital Ocean App Platform

1. **Create a Digital Ocean account**:
   - Go to [Digital Ocean](https://www.digitalocean.com/)

2. **Create a new App**:
   - Go to App Platform in the sidebar
   - Click "Create App"
   - Connect your GitHub repository

3. **Configure the app**:
   - **Environment**: Node.js
   - **Build Command**: `npm install && cd frontend && npm install && npm run build && cd ../backend && npm install`
   - **Run Command**: `cd backend && npm start`

4. **Set environment variables**:
   - Add all variables from your `.env` file

5. **Deploy**:
   - Confirm settings and deploy your app

## Troubleshooting

### Missing Dependencies
If you encounter "module not found" errors:
- Ensure your package.json includes all required dependencies
- Try specifying exact versions instead of using the ^ prefix

### Environment Variables
If the application can't find environment variables:
- Verify they are correctly set in the platform's environment settings
- For Node.js apps, ensure dotenv is properly configured

### Build Failures
If the build process fails:
- Check the build logs for specific errors
- Ensure your Node.js version is compatible with your dependencies
- Try clearing build caches if the platform supports it

## Support

If you need additional help, please create an issue in the GitHub repository. 