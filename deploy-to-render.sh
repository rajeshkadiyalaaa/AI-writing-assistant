#!/bin/bash
set -e

echo "Preparing for Render deployment..."

# Commit any pending changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Committing pending changes..."
  git add .
  git commit -m "Prepare for Render deployment"
fi

# Push to the repository
echo "Pushing to GitHub..."
git push

echo "Deployment preparation complete!"
echo "Now, go to your Render dashboard at https://dashboard.render.com/ and:"
echo "1. Create a new Web Service from your GitHub repository"
echo "2. Configure the service using the settings in render.yaml"
echo "3. Add your OPENROUTER_API_KEY as an environment variable"
echo "4. Deploy the service"
echo ""
echo "Once deployed, your AI Writing Assistant will be available at the URL provided by Render." 