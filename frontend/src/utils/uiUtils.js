/**
 * UI utilities for the AI Writing Assistant
 */

/**
 * Copy text to clipboard
 * @param {string} text - The text to copy
 * @returns {Promise<boolean>} Whether the copy was successful
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
};

/**
 * Show or hide an element when clicking outside of it
 * @param {React.RefObject} ref - The ref of the element to check
 * @param {Function} setIsVisible - The state setter for visibility
 * @returns {Function} A function to handle clicks
 */
export const createClickOutsideHandler = (ref, setIsVisible) => {
  return (event) => {
    if (ref.current && !ref.current.contains(event.target)) {
      setIsVisible(false);
    }
  };
};

/**
 * Create a toast notification
 * @param {string} message - The notification message
 * @param {string} type - The notification type ('success', 'error', 'info')
 * @param {Function} setNotifications - The state setter for notifications
 */
export const showNotification = (message, type = 'success', setNotifications) => {
  const id = Date.now(); // Use timestamp as unique ID
  setNotifications(prev => [...prev, { id, message, type }]);
  
  // Auto-remove notification after 5 seconds
  setTimeout(() => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, 5000);
};

/**
 * Get a CSS class based on dark mode state
 * @param {boolean} isDarkMode - Whether dark mode is enabled
 * @param {string} darkClass - The class to use in dark mode
 * @param {string} lightClass - The class to use in light mode
 * @returns {string} The appropriate CSS class
 */
export const getModeClass = (isDarkMode, darkClass, lightClass) => {
  return isDarkMode ? darkClass : lightClass;
};

/**
 * Normalize suggestions from the API
 * @param {Array|Object} suggestionData - The suggestion data from API
 * @returns {Array} Normalized suggestions
 */
export const normalizeSuggestions = (suggestionData) => {
  // If suggestionData is already an array of suggestions, return it
  if (Array.isArray(suggestionData)) return suggestionData;
  
  // If it has a suggestions property that's an array, return it
  if (suggestionData && Array.isArray(suggestionData.suggestions)) {
    return suggestionData.suggestions;
  }
  
  // Otherwise, return empty array
  return [];
};

/**
 * Map categories to suggestion types
 * @param {string} category - The suggestion category
 * @returns {string} The suggestion type
 */
export const mapCategoryToType = (category) => {
  const typeMap = {
    'improvement': 'improvement',
    'alternative': 'alternative',
    'grammar': 'grammar',
    'clarity': 'improvement',
    'conciseness': 'improvement',
    'suggestion': 'improvement',
    'style': 'alternative',
    'spelling': 'grammar',
    'punctuation': 'grammar'
  };
  
  return typeMap[category.toLowerCase()] || 'improvement';
}; 