const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const { runPythonScript, parsePythonJson, parsePythonJsonOrThrow, PYTHON_BIN } = require('./pythonRunner');
const { sanitizeApiKey, isValidOpenRouterKey } = require('./sanitizeKey');
const {
  sendError,
  statusForPythonPayload,
  handleRouteError,
  requireServerApiKey,
} = require('./apiErrors');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (process.env.OPENROUTER_API_KEY) {
  const raw = process.env.OPENROUTER_API_KEY;
  const cleaned = sanitizeApiKey(raw);
  if (cleaned !== raw) {
    console.warn('OPENROUTER_API_KEY in .env contained invisible characters — sanitized.');
  }
  process.env.OPENROUTER_API_KEY = cleaned;
}

console.log('API Key loaded:', process.env.OPENROUTER_API_KEY ? 'Yes (key found)' : 'No (key not found)');

const app = express();
const PORT = process.env.PORT || 5001;
const DEFAULT_OPENROUTER_MODEL = process.env.DEFAULT_MODEL || 'openrouter/free';
const { isValidOpenRouterModelId } = require('./modelId');

const MAX_CHAT_MESSAGES = 80;
const MAX_MESSAGE_CONTENT_CHARS = 120000;
const MAX_SUGGESTION_CONTENT_CHARS = 200000;
const MAX_IMPROVE_CONTENT_CHARS = 400000;

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function assertValidChatMessages(messages) {
  if (!Array.isArray(messages)) {
    throw badRequest('messages must be an array.');
  }
  if (messages.length === 0) {
    throw badRequest('No messages provided.');
  }
  if (messages.length > MAX_CHAT_MESSAGES) {
    throw badRequest(`Too many messages (max ${MAX_CHAT_MESSAGES}).`);
  }
  for (let i = 0; i < messages.length; i += 1) {
    const m = messages[i];
    if (!m || typeof m !== 'object') {
      throw badRequest(`Invalid message at index ${i}.`);
    }
    const { role, content } = m;
    if (!['user', 'assistant', 'system'].includes(role)) {
      throw badRequest(`Invalid message role at index ${i}.`);
    }
    if (typeof content !== 'string') {
      throw badRequest(`Message content must be a string at index ${i}.`);
    }
    if (content.length > MAX_MESSAGE_CONTENT_CHARS) {
      throw badRequest(`Message ${i} exceeds maximum length.`);
    }
  }
}

function resolveModelForRequest(rawModel) {
  if (rawModel == null || rawModel === '') {
    return DEFAULT_OPENROUTER_MODEL;
  }
  const s = String(rawModel).trim();
  if (!isValidOpenRouterModelId(s)) {
    throw badRequest(
      'Invalid model ID. Use a valid OpenRouter model slug (letters, numbers, /, :, ., _).',
    );
  }
  return s;
}

const publicAppUrl =
  process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

const getOpenRouterHeaders = (apiKey) => {
  const key = sanitizeApiKey(apiKey);
  return {
  'Authorization': `Bearer ${key}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': publicAppUrl,
  'X-Title': 'AI Writing Assistant',
};
};

const parseOpenRouterError = async (response) => {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return json.error?.message || json.message || text;
  } catch {
    return text || response.statusText;
  }
};

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'production') {
      callback(new Error('Not allowed by CORS'));
    } else {
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));
app.use(bodyParser.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 400, 'Invalid JSON in request body');
  }
  return next(err);
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  console.log('Serving static files from:', frontendBuildPath);
  app.use(express.static(frontendBuildPath));
  
  // Always return the main index.html for any route not handled by API or static files
  app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendBuildPath, 'index.html'));
    }
    return next();
  });
}

const { getTaskSpecificFreeModels, invalidateModelsCache } = require('./openRouterModels');

app.get('/api/models', async (req, res) => {
  try {
    const { models, default_model, source, at } = await getTaskSpecificFreeModels();
    res.json({
      default_model: process.env.DEFAULT_MODEL || default_model,
      models,
      source,
      updated_at: at ? new Date(at).toISOString() : null,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to load models from OpenRouter');
  }
});

app.post('/api/models/refresh', async (req, res) => {
  try {
    invalidateModelsCache();
    const { models, default_model, source, at } = await getTaskSpecificFreeModels();
    res.json({
      default_model: process.env.DEFAULT_MODEL || default_model,
      models,
      source,
      updated_at: at ? new Date(at).toISOString() : null,
    });
  } catch (error) {
    return handleRouteError(res, error, 'Failed to refresh models from OpenRouter');
  }
});

async function prepareChatMessages(body) {
  const { messages, model, documentType, tone, temperature } = body;
  assertValidChatMessages(messages);
  const modelId = resolveModelForRequest(model);
  const { stdout } = await runPythonScript('generate_response.py', {
    messages,
    model: modelId,
    documentType,
    tone,
    temperature,
    prepareOnly: true,
  });
  const prepared = parsePythonJson(stdout);
  if (prepared.error) {
    const err = new Error(prepared.error);
    err.details = prepared.details;
    throw err;
  }
  return prepared;
}

// API endpoint to generate AI responses
app.post('/api/generate', async (req, res) => {
  try {
    const { messages, documentType, tone, temperature } = req.body;
    assertValidChatMessages(messages);
    const modelId = resolveModelForRequest(req.body.model);
    const { stdout } = await runPythonScript('generate_response.py', {
      messages,
      model: modelId,
      documentType,
      tone,
      temperature,
    });
    const jsonResponse = parsePythonJsonOrThrow(stdout);
    return res.json(jsonResponse);
  } catch (error) {
    if (error.pythonPayload) {
      const status = statusForPythonPayload(error.pythonPayload) || 502;
      return sendError(res, status, error.message, { details: error.details });
    }
    return handleRouteError(res, error, 'Error generating response');
  }
});

// Stream chat completions from OpenRouter (SSE proxy)
app.post('/api/generate/stream', async (req, res) => {
  const apiKey = requireServerApiKey(res);
  if (!apiKey) return;

  try {
    assertValidChatMessages(req.body.messages);
    const prepared = await prepareChatMessages(req.body);
    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: prepared.model || req.body.model || DEFAULT_OPENROUTER_MODEL,
        messages: prepared.messages,
        temperature: prepared.temperature ?? req.body.temperature ?? 0.7,
        max_tokens: prepared.max_tokens ?? 1000,
        stream: true,
      }),
    });

    if (!openRouterRes.ok) {
      const message = await parseOpenRouterError(openRouterRes);
      const status = openRouterRes.status >= 400 && openRouterRes.status < 600
        ? openRouterRes.status
        : 502;
      return sendError(res, status, message, {
        code: status === 401 ? 'API_KEY' : status === 429 ? 'RATE_LIMIT' : undefined,
      });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    openRouterRes.body.on('data', (chunk) => res.write(chunk));
    openRouterRes.body.on('end', () => res.end());
    openRouterRes.body.on('error', (err) => {
      console.error('Stream pipe error:', err.message);
      if (!res.headersSent) {
        sendError(res, 502, 'Stream interrupted', { details: err.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: { message: err.message || 'Stream interrupted' } })}\n\n`);
        res.end();
      }
    });
  } catch (error) {
    console.error('Stream generate error:', error.message);
    if (!res.headersSent) {
      return handleRouteError(res, error, 'Stream failed');
    }
    res.write(`data: ${JSON.stringify({ error: { message: error.message || 'Stream failed' } })}\n\n`);
    res.end();
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

    if (typeof content !== 'string' || content.length > MAX_SUGGESTION_CONTENT_CHARS) {
      return sendError(res, 400, `Content is too long (max ${MAX_SUGGESTION_CONTENT_CHARS} characters).`);
    }

    let modelId;
    try {
      modelId = resolveModelForRequest(model);
    } catch (e) {
      return handleRouteError(res, e, 'Invalid request');
    }
    
    const { stdout } = await runPythonScript('generate_suggestions.py', {
      content,
      documentType,
      tone,
      model: modelId,
    });

    const jsonResponse = parsePythonJsonOrThrow(stdout);
    return res.json(jsonResponse);
  } catch (error) {
    const fallbackSuggestion = {
      id: 1,
      type: 'improvement',
      text: 'The server encountered an error. Check your API key and that Python 3 is installed.',
    };
    if (error.pythonPayload) {
      const status = statusForPythonPayload(error.pythonPayload) || 502;
      return res.status(status).json({
        error: error.message,
        details: error.details || '',
        suggestions: error.pythonPayload.suggestions || [fallbackSuggestion],
      });
    }
    return res.status(502).json({
      error: error.message || 'Error generating suggestions',
      details: error.details,
      suggestions: [fallbackSuggestion],
    });
  }
});

// API endpoint to improve readability of content
app.post('/api/improve', async (req, res) => {
  try {
    const {
      content,
      selectedText,
      selectionStart,
      selectionEnd,
      targetAudience,
      readingLevel,
      additionalInstructions,
      model,
    } = req.body;

    if (content != null && typeof content === 'string' && content.length > MAX_IMPROVE_CONTENT_CHARS) {
      return sendError(res, 400, `Content is too long (max ${MAX_IMPROVE_CONTENT_CHARS} characters).`);
    }

    let modelId;
    try {
      modelId = resolveModelForRequest(model);
    } catch (e) {
      return handleRouteError(res, e, 'Invalid request');
    }

    const { stdout } = await runPythonScript('improve_readability.py', {
      content,
      selectedText,
      selectionStart,
      selectionEnd,
      targetAudience,
      readingLevel,
      additionalInstructions,
      model: modelId,
    });

    const jsonResponse = parsePythonJsonOrThrow(stdout);
    return res.json(jsonResponse);
  } catch (error) {
    if (error.pythonPayload) {
      const status = statusForPythonPayload(error.pythonPayload) || 502;
      return sendError(res, status, error.message, { details: error.details });
    }
    return handleRouteError(res, error, 'Error improving content');
  }
});

// API endpoint to verify an OpenRouter API key (no model required)
app.post('/api/verify-apikey', async (req, res) => {
  try {
    const useApiKey = sanitizeApiKey(req.body.apiKey || process.env.OPENROUTER_API_KEY);

    if (!useApiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key not found. Please enter your OpenRouter API key.',
      });
    }

    if (!isValidOpenRouterKey(useApiKey)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format. Paste a clean key from openrouter.ai/keys (starts with sk-or-).',
      });
    }

    console.log('Verifying OpenRouter API key...');
    const response = await fetch('https://openrouter.ai/api/v1/key', {
      method: 'GET',
      headers: getOpenRouterHeaders(useApiKey),
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({
        success: true,
        label: data.data?.label,
        limit_remaining: data.data?.limit_remaining,
      });
    }

    const message = await parseOpenRouterError(response);
    console.error(`API key verification error: ${message}`);

    if (response.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired API key. Create a new key at https://openrouter.ai/keys',
      });
    }

    return res.status(400).json({
      success: false,
      error: message || `API key could not be verified (${response.status})`,
    });
  } catch (error) {
    console.error('Error verifying API key:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while verifying the key. Please try again.',
    });
  }
});

// API endpoint to verify a custom model
app.post('/api/verify-model', async (req, res) => {
  try {
    const { model, apiKey } = req.body;
    
    if (!model) {
      return res.status(400).json({ success: false, error: 'Model ID is required' });
    }
    if (!isValidOpenRouterModelId(model)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model ID format.',
      });
    }
    
    const useApiKey = sanitizeApiKey(apiKey || process.env.OPENROUTER_API_KEY);
    if (!useApiKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'API key not found. Please set OPENROUTER_API_KEY in your .env file or provide it in the request.'
      });
    }
    if (!isValidOpenRouterKey(useApiKey)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format. Paste a clean key from openrouter.ai/keys.',
      });
    }
    
    const payload = {
      model: model,
      messages: [
        { role: 'user', content: 'Reply with only: ok' }
      ],
      max_tokens: 5
    };
    
    console.log(`Verifying model: ${model}`);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: getOpenRouterHeaders(useApiKey),
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      res.json({ success: true, model: model });
    } else {
      const message = await parseOpenRouterError(response);
      console.error(`Model verification error: ${message}`);

      if (response.status === 401) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired API key. Create a new key at https://openrouter.ai/keys',
        });
      }

      if (response.status === 404) {
        return res.status(400).json({
          success: false,
          error: `Model "${model}" was not found on OpenRouter. It may have been renamed or removed.`,
          details: message,
        });
      }

      res.status(400).json({ 
        success: false, 
        error: message || `Model could not be verified (${response.status})`,
      });
    }
  } catch (error) {
    console.error('Error verifying model:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error while verifying the model. Please try again.',
    });
  }
});

// API endpoint to update API key
app.post('/api/settings/apikey', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_UI_API_KEY !== 'true') {
      return res.status(403).json({
        error:
          'API keys cannot be set via the UI in production. Set OPENROUTER_API_KEY in your server .env file.',
      });
    }

    const raw = req.body.apiKey;
    if (!raw || String(raw).trim() === '') {
      return res.status(400).json({ error: 'API key cannot be empty' });
    }

    const cleaned = sanitizeApiKey(raw);
    if (raw !== cleaned && cleaned.length > 0) {
      console.warn('API key from UI contained invisible characters — removed before save.');
    }

    if (!isValidOpenRouterKey(cleaned)) {
      return res.status(400).json({
        error: 'Invalid API key. Copy a fresh key from openrouter.ai/keys with no extra spaces or line breaks.',
      });
    }

    process.env.OPENROUTER_API_KEY = cleaned;
    const maskedKey = maskApiKey(cleaned);
    
    console.log('API key updated successfully');
    res.json({ 
      success: true, 
      message: 'API key updated successfully',
      maskedKey
    });
  } catch (error) {
    return handleRouteError(res, error, 'Could not update API key');
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
    return handleRouteError(res, error, 'Could not read API key status');
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
  const isProd = process.env.NODE_ENV === 'production';
  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    python: PYTHON_BIN,
    apiKeyConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    allowUiApiKeySave: !isProd || process.env.ALLOW_UI_API_KEY === 'true',
  });
});

// Unhandled API errors
app.use('/api', (req, res) => {
  sendError(res, 404, `API route not found: ${req.method} ${req.path}`);
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  handleRouteError(res, err, 'Internal server error');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Python: ${PYTHON_BIN}`);
}); 