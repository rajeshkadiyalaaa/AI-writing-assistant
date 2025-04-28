const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Debug: Check if API key is loaded
console.log('API Key loaded:', process.env.OPENROUTER_API_KEY ? 'Yes (key found)' : 'No (key not found)');

const app = express();
const PORT = process.env.PORT || 5000;

// Helper function to generate full allowed origins for CORS
const getAllowedOrigins = () => {
  const origins = ['http://localhost:3000']; // Always allow localhost for development
  
  if (process.env.NODE_ENV === 'production') {
    // Add production origins
    if (process.env.FRONTEND_URL) {
      // Add both http and https versions of the FRONTEND_URL
      origins.push(`http://${process.env.FRONTEND_URL}`);
      origins.push(`https://${process.env.FRONTEND_URL}`);
    }
    
    // Add common Render domains
    origins.push('https://ai-writing-assistant.onrender.com');
    // Add pattern for Render preview URLs
    origins.push(/\.onrender\.com$/);
  }
  
  return origins;
};

// Middleware
app.use(cors({
  origin: getAllowedOrigins(),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  console.log('Serving static files from:', frontendBuildPath);
  app.use(express.static(frontendBuildPath));
  
  // Always return the main index.html for any route not handled by API or static files
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    }
  });
}

// API endpoint to get available models
app.get('/api/models', (req, res) => {
  try {
    // Read default model from environment variable
    const defaultModel = process.env.DEFAULT_MODEL || 'openrouter/quasar-alpha';
    
    // Return a list of available models
    res.json({
      default_model: defaultModel,
      models: [
        { id: 'openrouter/quasar-alpha', name: 'Quasar Alpha' },
        { id: 'google/gemini-2.5-pro-exp-03-25:free', name: 'gemini-2.5-pro-exp-' },
        { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3' }
      ]
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// API endpoint for chat functionality
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model } = req.body;
    console.log(`Chat request received with model: ${model}`);
    
    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }
    
    // Create a Python process to generate response using generate_response.py
    const pythonProcess = spawn('python', [
      path.join(__dirname, './scripts/generate_response.py'),
      JSON.stringify({
        messages: [{ role: 'user', content: message }],
        model,
        documentType: 'casual', // Override document type for chat
        tone: 'friendly'  // Use friendly tone for chat
      })
    ]);
    
    let responseData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      responseData += data.toString();
      console.log(`Python stdout: ${data}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`Python stderr: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      
      if (code !== 0) {
        console.error(`Error executing Python script: ${errorData}`);
        return res.status(500).json({ 
          error: 'Error generating chat response',
          details: errorData
        });
      }
      
      try {
        const jsonResponse = JSON.parse(responseData);
        
        // If the response contains an error from the API
        if (jsonResponse.error) {
          console.error(`API error: ${jsonResponse.error}`);
          console.error(`Details: ${jsonResponse.details || 'No details provided'}`);
          return res.status(500).json(jsonResponse);
        }
        
        return res.json(jsonResponse);
      } catch (error) {
        console.error(`Error parsing JSON response: ${error.message}`);
        console.error(`Raw response: ${responseData}`);
        
        // If not valid JSON, return as plain text
        return res.json({ response: responseData });
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// API endpoint to generate AI responses
app.post('/api/generate', async (req, res) => {
  try {
    const { messages, model, documentType, tone } = req.body;
    
    // Create a Python process to use our existing OpenRouter integration
    const pythonProcess = spawn('python', [
      path.join(__dirname, './scripts/generate_response.py'),
      JSON.stringify({
        messages,
        model,
        documentType,
        tone
      })
    ]);
    
    let responseData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      responseData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Error generating response' });
      }
      
      try {
        const jsonResponse = JSON.parse(responseData);
        return res.json(jsonResponse);
      } catch (error) {
        // If not valid JSON, return as plain text
        return res.json({ response: responseData });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to generate writing suggestions
app.post('/api/suggestions', async (req, res) => {
  try {
    const { content, documentType, tone, model } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ 
        error: 'No content provided',
        suggestions: [
          { id: 1, type: 'grammar', text: 'Please provide some text to analyze for suggestions.' }
        ]
      });
    }
    
    console.log(`Generating suggestions for ${documentType} content with ${tone} tone using model: ${model}`);
    
    // Create a Python process to use our existing AI integration
    const pythonProcess = spawn('python', [
      path.join(__dirname, './scripts/generate_suggestions.py'),
      JSON.stringify({
        content,
        documentType,
        tone,
        model
      })
    ]);
    
    let responseData = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      responseData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`Python stderr: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(`Error output: ${errorOutput}`);
        return res.status(500).json({ 
          error: 'Error generating suggestions',
          details: errorOutput,
          suggestions: [
            { id: 1, type: 'improvement', text: 'The system encountered an error while analyzing your text. Please try again with different content or check your API key.' }
          ]
        });
      }
      
      try {
        console.log(`Python process completed. Parsing response...`);
        // Validate the response is proper JSON
        if (!responseData || responseData.trim() === '') {
          throw new Error('Empty response from Python script');
        }
        
        const jsonResponse = JSON.parse(responseData);
        
        // Extra validation for response structure
        if (jsonResponse.error) {
          console.error(`Error in Python response: ${jsonResponse.error}`);
          // Still return a structured response with error and fallback suggestions
          return res.json({
            error: jsonResponse.error,
            details: jsonResponse.details || '',
            suggestions: [
              { id: 1, type: 'improvement', text: 'Could not generate suggestions. ' + jsonResponse.error }
            ]
          });
        }
        
        // Validate suggestions exist in some form
        if (!jsonResponse.suggestions && !jsonResponse.raw_suggestions) {
          console.log('No suggestions found in response, providing fallback');
          jsonResponse.suggestions = {
            'other': ['The system analyzed your text but couldn\'t generate specific suggestions.']
          };
        }
        
        return res.json(jsonResponse);
      } catch (error) {
        console.error(`Error parsing Python response: ${error.message}`);
        console.error(`Raw response: ${responseData}`);
        // Return example suggestions if parsing fails
        return res.json({ 
          error: 'Failed to parse response from suggestion generator',
          suggestions: [
            { id: 1, type: 'improvement', text: 'Consider using more concise language.' },
            { id: 2, type: 'alternative', text: 'Alternative phrasing: "This system would enhance productivity."' },
            { id: 3, type: 'grammar', text: 'Grammar issue: Check punctuation in this sentence.' }
          ]
        });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Server error',
      suggestions: [
        { id: 1, type: 'grammar', text: 'The server encountered an error while processing your request.' }
      ]
    });
  }
});

// API endpoint to improve readability of content
app.post('/api/improve', async (req, res) => {
  try {
    const { content, targetAudience, readingLevel, additionalInstructions, model } = req.body;
    
    console.log(`Improving readability for ${targetAudience} audience at ${readingLevel} level using model: ${model}`);
    
    // Create a Python process to use the improve_readability script
    const pythonProcess = spawn('python', [
      path.join(__dirname, './scripts/improve_readability.py'),
      JSON.stringify({
        content,
        targetAudience,
        readingLevel,
        additionalInstructions,
        model
      })
    ]);
    
    let responseData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      responseData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        return res.status(500).json({ error: 'Error improving content readability' });
      }
      
      try {
        console.log(`Python process completed. Parsing response...`);
        const jsonResponse = JSON.parse(responseData);
        return res.json(jsonResponse);
      } catch (error) {
        console.error(`Error parsing Python response: ${error.message}`);
        console.error(`Raw response: ${responseData}`);
        // Return error if parsing fails
        return res.status(500).json({ 
          error: 'Failed to parse improved content' 
        });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to verify a custom model
app.post('/api/verify-model', async (req, res) => {
  try {
    const { model, apiKey } = req.body;
    
    if (!model) {
      return res.status(400).json({ success: false, error: 'Model ID is required' });
    }
    
    // Get API key from request or environment
    const useApiKey = apiKey || process.env.OPENROUTER_API_KEY;
    if (!useApiKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'API key not found. Please set OPENROUTER_API_KEY in your .env file or provide it in the request.'
      });
    }
    
    // Prepare headers for API request
    const headers = {
      'Authorization': `Bearer ${useApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://example.com'  // Replace with your actual domain
    };
    
    // Send a minimal test request to verify the model
    const payload = {
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, can you respond with a single word to verify connectivity?' }
      ],
      max_tokens: 10
    };
    
    // Make the API request to OpenRouter
    console.log(`Verifying model: ${model}`);
    
    // Use fetch for the request
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    // Check if the request was successful
    if (response.ok) {
      res.json({ success: true, model: model });
    } else {
      const errorText = await response.text();
      console.error(`Model verification error: ${errorText}`);
      res.status(400).json({ 
        success: false, 
        error: `Model could not be verified: ${response.status} ${response.statusText}`,
        details: errorText
      });
    }
  } catch (error) {
    console.error('Error verifying model:', error);
    res.status(500).json({ 
      success: false, 
      error: `Server error: ${error.message}` 
    });
  }
});

// API endpoint to update API key
app.post('/api/settings/apikey', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey || apiKey.trim() === '') {
      return res.status(400).json({ error: 'API key cannot be empty' });
    }

    // Simple validation for OpenRouter API key format (starts with sk-or-)
    if (!apiKey.startsWith('sk-or-')) {
      return res.status(400).json({ error: 'Invalid API key format. OpenRouter API keys should start with sk-or-' });
    }

    // In a production app, you'd update an environment variable or database
    // For demo purposes, we'll update the in-memory value
    process.env.OPENROUTER_API_KEY = apiKey;
    
    // Return a masked version of the API key (first 3 and last 5 chars)
    const maskedKey = maskApiKey(apiKey);
    
    console.log('API key updated successfully');
    res.json({ 
      success: true, 
      message: 'API key updated successfully',
      maskedKey
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// API endpoint to get the masked API key
app.get('/api/settings/apikey', (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const maskedKey = maskApiKey(apiKey);
    
    res.json({ 
      maskedKey,
      isSet: apiKey !== ''
    });
  } catch (error) {
    console.error('Error getting API key info:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Helper function to mask the API key
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return '';
  
  const firstThree = apiKey.substring(0, 3);
  const lastFive = apiKey.substring(apiKey.length - 5);
  const masked = `${firstThree}...${lastFive}`;
  
  return masked;
}

// Health check endpoint for debugging deployment issues
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    port: PORT
  });
});

// Log important information before starting
console.log(`Starting server with the following configuration:
- Port: ${PORT}
- Environment: ${process.env.NODE_ENV || 'development'}
- API Key present: ${process.env.OPENROUTER_API_KEY ? 'Yes' : 'No'}
- Debug: ${process.env.DEBUG || 'False'}
- Log Level: ${process.env.LOG_LEVEL || 'INFO'}
- Default Model: ${process.env.DEFAULT_MODEL || 'default model not set'}`);

// Start server - bind to all interfaces (0.0.0.0) for cloud hosting compatibility
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server is ready to accept connections`);
}); 