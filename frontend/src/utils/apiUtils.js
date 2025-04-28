/**
 * API utilities for the AI Writing Assistant
 */
import api from '../api';

/**
 * Test an API key with OpenRouter
 * @param {string} apiKey - The API key to test
 * @returns {Promise<Object>} A promise that resolves to the test result
 */
export const testApiKey = async (apiKey) => {
  if (!apiKey.trim()) {
    throw new Error('API key cannot be empty');
  }
  
  if (!apiKey.startsWith('sk-or-')) {
    throw new Error('Invalid API key format. OpenRouter API keys should start with sk-or-');
  }
  
  // Test the API key
  const response = await api.post('/api/verify-model', {
    model: 'nvidia/llama-3.1-nemotron-nano-8b-v1:free', // Use a free model for testing
    apiKey
  });
  
  return response.data;
};

/**
 * Update the API key
 * @param {string} apiKey - The new API key
 * @param {boolean} rememberKey - Whether to remember the key in localStorage
 * @returns {Promise<Object>} A promise that resolves to the update result
 */
export const updateApiKey = async (apiKey, rememberKey) => {
  if (!apiKey.trim()) {
    throw new Error('API key cannot be empty');
  }
  
  const response = await api.post('/api/settings/apikey', {
    apiKey
  });
  
  // If remember key is checked, store in localStorage
  if (rememberKey) {
    localStorage.setItem('openrouter_api_key', apiKey);
  } else {
    // Otherwise make sure it's removed from localStorage
    localStorage.removeItem('openrouter_api_key');
  }
  
  return response.data;
};

/**
 * Fetch the current API key information
 * @returns {Promise<Object>} A promise that resolves to the API key info
 */
export const fetchApiKeyInfo = async () => {
  // Check if we have a key in localStorage
  const storedKey = localStorage.getItem('openrouter_api_key');
  
  if (storedKey) {
    // If we have a stored key, use it to get the masked version
    const response = await api.post('/api/settings/apikey', {
      apiKey: storedKey
    });
    
    return {
      maskedKey: response.data.maskedKey,
      isSet: true
    };
  } else {
    // Otherwise, just check if the server has an API key set
    const response = await api.get('/api/settings/apikey');
    return {
      maskedKey: response.data.maskedKey,
      isSet: response.data.isSet
    };
  }
};

/**
 * Verify a custom model with OpenRouter
 * @param {string} modelId - The model ID to verify
 * @returns {Promise<Object>} A promise that resolves to the verification result
 */
export const verifyCustomModel = async (modelId) => {
  if (!modelId.trim()) {
    throw new Error('Model ID cannot be empty');
  }
  
  const response = await api.post('/api/verify-model', {
    model: modelId
  });
  
  return response.data;
};

/**
 * Generate an AI response
 * @param {Array} messages - The chat messages
 * @param {string} model - The model to use
 * @param {string} documentType - The document type
 * @param {string} tone - The tone to use
 * @param {number} temperature - The temperature setting
 * @returns {Promise<Object>} A promise that resolves to the generated response
 */
export const generateAIResponse = async (messages, model, documentType, tone, temperature) => {
  const response = await api.post('/api/generate', {
    messages,
    model,
    documentType,
    tone,
    temperature
  });
  
  return response.data;
};

/**
 * Generate writing suggestions
 * @param {string} content - The content to generate suggestions for
 * @param {string} documentType - The document type
 * @param {string} tone - The tone to use
 * @returns {Promise<Object>} A promise that resolves to the generated suggestions
 */
export const generateSuggestions = async (content, documentType, tone) => {
  const response = await api.post('/api/suggestions', {
    content,
    documentType,
    tone
  });
  
  return response.data;
};

/**
 * Improve writing content
 * @param {string} content - The content to improve
 * @param {string} targetAudience - The target audience
 * @param {string} readingLevel - The reading level
 * @param {string} additionalInstructions - Any additional instructions
 * @returns {Promise<Object>} A promise that resolves to the improved content
 */
export const improveWriting = async (content, targetAudience, readingLevel, additionalInstructions) => {
  const response = await api.post('/api/improve', {
    content,
    targetAudience,
    readingLevel,
    additionalInstructions
  });
  
  return response.data;
}; 