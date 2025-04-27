/**
 * Model utilities for the AI Writing Assistant
 */

/**
 * Get the recommended model for a specific document type
 * @param {string} docType - The document type
 * @param {Array} modelOptions - Available model options
 * @returns {Object} The recommended model
 */
export const getRecommendedModel = (docType, modelOptions) => {
  // Find models that are strong in this document type
  const recommendedModels = modelOptions.filter(m => m.strengths.includes(docType));
  
  // Return the first recommended model or the first model in the list as fallback
  return recommendedModels.length > 0 ? recommendedModels[0] : modelOptions[0];
};

/**
 * Check if a model is recommended for the current document type
 * @param {string} modelId - The model ID to check
 * @param {string} documentType - The current document type
 * @param {Array} modelOptions - Available model options
 * @returns {boolean} Whether the model is recommended
 */
export const isRecommendedModel = (modelId, documentType, modelOptions) => {
  return modelOptions.some(m => m.id === modelId && m.strengths.includes(documentType));
};

/**
 * Get display name for a model
 * @param {string} modelId - The model ID
 * @param {Array} modelOptions - Available model options
 * @returns {string} The display name
 */
export const getModelDisplayName = (modelId, modelOptions) => {
  const model = modelOptions.find(m => m.id === modelId);
  return model ? model.name : modelId;
};

/**
 * Estimate token cost for a model
 * @param {number} tokens - The number of tokens
 * @param {string} modelId - The model ID
 * @returns {number} The estimated cost in USD
 */
export const estimateCost = (tokens, modelId) => {
  // Default rate (can be expanded with actual pricing)
  const rate = 0.000002;
  
  // Custom rates for specific models
  const modelRates = {
    'nvidia/llama-3.1-nemotron-nano-8b-v1:free': 0,
    'google/gemini-2.5-pro-exp-03-25:free': 0,
    'deepseek/deepseek-chat-v3-0324:free': 0
  };
  
  const modelRate = modelRates[modelId] !== undefined ? modelRates[modelId] : rate;
  
  return tokens * modelRate;
};

/**
 * Load models from localStorage and combine with defaults
 * @returns {Array} Combined model options
 */
export const loadModels = () => {
  // Load any saved custom models from localStorage
  const savedCustomModels = JSON.parse(localStorage.getItem('custom_models') || '[]');
  
  // Start with the default models
  const defaultModels = [
    { 
      id: 'nvidia/llama-3.1-nemotron-nano-8b-v1:free', 
      name: 'nvidia-llama-3.1',
      strengths: ['general', 'creative'],
      description: 'Balanced model good for general-purpose writing and creative tasks',
      free: true
    },
    { 
      id: 'google/gemini-2.5-pro-exp-03-25:free', 
      name: 'gemini-2.5-pro-exp-',
      strengths: ['email', 'business'],
      description: 'Strong at crafting concise and effective communications',
      free: true
    },
    { 
      id: 'deepseek/deepseek-chat-v3-0324:free', 
      name: 'DeepSeek V3',
      strengths: ['academic', 'technical'],
      description: 'Specialized in technical content and research writing',
      free: true
    }
  ];
  
  // Combine with any saved custom models
  return [...defaultModels, ...savedCustomModels];
};

/**
 * Save custom models to localStorage
 * @param {Array} customModels - The custom models to save
 */
export const saveCustomModels = (customModels) => {
  localStorage.setItem('custom_models', JSON.stringify(customModels));
}; 