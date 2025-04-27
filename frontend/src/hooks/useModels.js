/**
 * Custom hook for model management
 */
import { useState, useEffect } from 'react';
import { 
  loadModels, 
  saveCustomModels, 
  getRecommendedModel, 
  isRecommendedModel 
} from '../utils/modelUtils';
import { verifyCustomModel } from '../utils/apiUtils';

/**
 * Custom hook for model management
 * @param {Function} showNotification - Function to show notifications
 * @returns {Object} Model management state and functions
 */
export const useModels = (showNotification) => {
  // Model options state
  const [modelOptions, setModelOptions] = useState(loadModels);
  const [model, setModel] = useState('');
  
  // Custom model form state
  const [customModelId, setCustomModelId] = useState('');
  const [customModelName, setCustomModelName] = useState('');
  const [isVerifyingModel, setIsVerifyingModel] = useState(false);

  // Initialize model on first load
  useEffect(() => {
    // Use the first model as default if not already set
    if (!model && modelOptions.length > 0) {
      setModel(modelOptions[0].id);
    }
  }, [model, modelOptions]);

  /**
   * Add a custom model
   * @returns {Promise<void>}
   */
  const addCustomModel = async () => {
    if (!customModelId.trim() || !customModelName.trim()) {
      showNotification('Both Model ID and Display Name are required', 'error');
      return;
    }
    
    setIsVerifyingModel(true);
    
    try {
      // Verify the model by sending a test request
      const response = await verifyCustomModel(customModelId);
      
      if (response.success) {
        // Create the new model object
        const newModel = {
          id: customModelId,
          name: customModelName,
          strengths: ['general'], // Default strength
          description: 'Custom model added by user',
          free: false, // Assume custom models are not free
          custom: true
        };
        
        // Add the new model to the model options array using setState
        setModelOptions(prevOptions => {
          const updatedOptions = [...prevOptions, newModel];
          return updatedOptions;
        });
        
        // Switch to the new model
        setModel(customModelId);
        
        // Reset form
        setCustomModelId('');
        setCustomModelName('');
        
        // Ask if user wants to save the model permanently
        const shouldSave = window.confirm(
          `Successfully verified model: ${customModelName}. \n\nDo you want to save this model for future sessions? \n\nClick 'OK' to save or 'Cancel' to use only for the current session.`
        );
        
        if (shouldSave) {
          // Save custom models to localStorage
          const savedCustomModels = modelOptions.filter(m => m.custom).concat([newModel]);
          saveCustomModels(savedCustomModels);
          
          // Show confirmation with toast notification
          showNotification(`Model "${customModelName}" saved for future sessions`, 'success');
        } else {
          // Show success message without saving
          showNotification(`Model "${customModelName}" added for this session only`, 'info');
        }
        
        return true;
      } else {
        throw new Error(response.error || 'Failed to verify model');
      }
    } catch (error) {
      console.error('Error verifying model:', error);
      showNotification(`Failed to verify model: ${error.message || 'Unknown error'}`, 'error');
      return false;
    } finally {
      setIsVerifyingModel(false);
    }
  };

  /**
   * Remove a custom model
   * @param {string} modelId - The model ID to remove
   * @returns {boolean} Whether the removal was successful
   */
  const removeCustomModel = (modelId) => {
    const modelToRemove = modelOptions.find(m => m.id === modelId);
    
    if (!modelToRemove || !modelToRemove.custom) {
      showNotification('Only custom models can be removed', 'error');
      return false;
    }
    
    const confirmRemove = window.confirm(`Are you sure you want to remove the model "${modelToRemove.name}"?`);
    
    if (confirmRemove) {
      // Remove from state using setState
      setModelOptions(prevOptions => prevOptions.filter(m => m.id !== modelId));
      
      // Remove from localStorage
      const savedCustomModels = modelOptions.filter(m => m.custom && m.id !== modelId);
      saveCustomModels(savedCustomModels);
      
      // If the current model was removed, switch to the first available model
      if (model === modelId) {
        const updatedOptions = modelOptions.filter(m => m.id !== modelId);
        if (updatedOptions.length > 0) {
          setModel(updatedOptions[0].id);
        }
      }
      
      showNotification(`Model "${modelToRemove.name}" has been removed`, 'info');
      return true;
    }
    
    return false;
  };

  /**
   * Get the recommended model for a document type
   * @param {string} documentType - The document type
   * @returns {Object} The recommended model
   */
  const getRecommendedModelForType = (documentType) => {
    return getRecommendedModel(documentType, modelOptions);
  };

  /**
   * Check if a model is recommended for a document type
   * @param {string} modelId - The model ID
   * @param {string} documentType - The document type
   * @returns {boolean} Whether the model is recommended
   */
  const isModelRecommended = (modelId, documentType) => {
    return isRecommendedModel(modelId, documentType, modelOptions);
  };

  return {
    // State
    modelOptions,
    model,
    customModelId,
    customModelName,
    isVerifyingModel,
    
    // State setters
    setModel,
    setCustomModelId,
    setCustomModelName,
    
    // Functions
    addCustomModel,
    removeCustomModel,
    getRecommendedModelForType,
    isModelRecommended
  };
}; 