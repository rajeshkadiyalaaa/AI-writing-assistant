/**
 * Custom hook for API key management
 */
import { useState, useEffect } from 'react';
import { fetchApiKeyInfo, updateApiKey, testApiKey } from '../utils/apiUtils';

/**
 * Custom hook for API key management
 * @param {Function} showNotification - Function to show notifications
 * @returns {Object} API key management state and functions
 */
export const useApiKey = (showNotification) => {
  // API key state
  const [apiKeySet, setApiKeySet] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const [rememberKey, setRememberKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isUpdatingApiKey, setIsUpdatingApiKey] = useState(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyTestSuccess, setApiKeyTestSuccess] = useState(false);

  // Fetch API key info on component mount
  useEffect(() => {
    const getApiKeyInfo = async () => {
      try {
        const keyInfo = await fetchApiKeyInfo();
        setMaskedApiKey(keyInfo.maskedKey);
        setApiKeySet(keyInfo.isSet);
      } catch (error) {
        console.error('Error fetching API key info:', error);
        showNotification('Failed to load API key information', 'error');
      }
    };
    
    getApiKeyInfo();
  }, [showNotification]);

  /**
   * Update the API key
   * @returns {Promise<boolean>} Whether the update was successful
   */
  const handleUpdateApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyError('API key cannot be empty');
      return false;
    }
    
    setIsUpdatingApiKey(true);
    setApiKeyError('');
    
    try {
      const response = await updateApiKey(apiKeyInput, rememberKey);
      
      setMaskedApiKey(response.maskedKey);
      setApiKeySet(true);
      setApiKeyInput(''); // Clear input after successful update
      setShowApiKey(false); // Hide the input
      
      // Show success message
      showNotification('API key updated successfully', 'success');
      return true;
      
    } catch (error) {
      console.error('Error updating API key:', error);
      setApiKeyError(error.message || 'Failed to update API key');
      showNotification('Failed to update API key: ' + (error.message || 'Unknown error'), 'error');
      return false;
    } finally {
      setIsUpdatingApiKey(false);
    }
  };

  /**
   * Test the API key
   * @returns {Promise<boolean>} Whether the test was successful
   */
  const handleTestApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyError('API key cannot be empty');
      return false;
    }
    
    if (!apiKeyInput.startsWith('sk-or-')) {
      setApiKeyError('Invalid API key format. OpenRouter API keys should start with sk-or-');
      return false;
    }
    
    setIsTestingApiKey(true);
    setApiKeyError('');
    setApiKeyTestSuccess(false);
    
    try {
      await testApiKey(apiKeyInput);
      
      // If no error was thrown, the test was successful
      setApiKeyTestSuccess(true);
      showNotification('API key test successful!', 'success');
      return true;
      
    } catch (error) {
      console.error('Error testing API key:', error);
      setApiKeyError(error.message || 'Failed to test API key');
      showNotification('API key test failed: ' + (error.message || 'Unknown error'), 'error');
      return false;
    } finally {
      setIsTestingApiKey(false);
    }
  };

  return {
    // State
    apiKeySet,
    maskedApiKey,
    apiKeyInput,
    apiKeyError,
    rememberKey,
    showApiKey,
    isUpdatingApiKey,
    isTestingApiKey,
    apiKeyTestSuccess,
    
    // State setters
    setApiKeyInput,
    setApiKeyError,
    setRememberKey,
    setShowApiKey,
    
    // Functions
    handleUpdateApiKey,
    handleTestApiKey
  };
}; 