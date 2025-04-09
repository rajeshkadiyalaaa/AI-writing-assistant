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

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
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
    const { content, documentType, tone } = req.body;
    
    // Create a Python process to use our existing AI integration
    const pythonProcess = spawn('python', [
      path.join(__dirname, './scripts/generate_suggestions.py'),
      JSON.stringify({
        content,
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
        return res.status(500).json({ error: 'Error generating suggestions' });
      }
      
      try {
        const jsonResponse = JSON.parse(responseData);
        return res.json(jsonResponse);
      } catch (error) {
        // Return example suggestions if parsing fails
        return res.json({ 
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
    res.status(500).json({ error: 'Server error' });
  }
});

// API endpoint to improve readability of content
app.post('/api/improve', async (req, res) => {
  try {
    const { content, targetAudience, readingLevel, additionalInstructions } = req.body;
    
    // Create a Python process to use the improve_readability script
    const pythonProcess = spawn('python', [
      path.join(__dirname, './scripts/improve_readability.py'),
      JSON.stringify({
        content,
        targetAudience,
        readingLevel,
        additionalInstructions
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
        return res.status(500).json({ error: 'Error improving content readability' });
      }
      
      try {
        const jsonResponse = JSON.parse(responseData);
        return res.json(jsonResponse);
      } catch (error) {
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
    const { model } = req.body;
    
    if (!model) {
      return res.status(400).json({ success: false, error: 'Model ID is required' });
    }
    
    // Get API key from environment
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'API key not found. Please set OPENROUTER_API_KEY in your .env file.'
      });
    }
    
    // Prepare headers for API request
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
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

// Handle React routing in production only
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
} else {
  // In development, just send a simple message for any non-API route
  app.get('*', (req, res) => {
    res.json({ 
      message: 'Backend server is running', 
      mode: 'development',
      endpoints: ['/api/generate', '/api/suggestions', '/api/improve'] 
    });
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
}); 