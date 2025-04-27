/**
 * Custom hook for UI management
 */
import { useState, useRef, useEffect } from 'react';
import { createClickOutsideHandler } from '../utils/uiUtils';

/**
 * Custom hook for UI management
 * @returns {Object} UI management state and functions
 */
export const useUI = () => {
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState('settings');
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    return parseInt(localStorage.getItem('leftPanelWidth') || '250');
  });
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    return parseInt(localStorage.getItem('rightPanelWidth') || '300');
  });
  
  // Tab state
  const [activeTab, setActiveTab] = useState('editor');
  
  // Dragging state
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  
  // UI visibility state
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTemperatureInfo, setShowTemperatureInfo] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showCustomModelForm, setShowCustomModelForm] = useState(false);
  
  // Notifications
  const [notifications, setNotifications] = useState([]);
  
  // Refs
  const settingsMenuRef = useRef(null);
  const exportMenuRef = useRef(null);
  const temperatureInfoRef = useRef(null);
  const apiKeyModalRef = useRef(null);
  const customModelFormRef = useRef(null);
  const leftResizeRef = useRef(null);
  const rightResizeRef = useRef(null);
  
  // Save dark mode to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);
  
  // Add click outside handlers
  useEffect(() => {
    // Settings menu
    document.addEventListener('mousedown', createClickOutsideHandler(settingsMenuRef, setShowSettingsMenu));
    
    // Export menu
    document.addEventListener('mousedown', createClickOutsideHandler(exportMenuRef, setShowExportMenu));
    
    // Temperature info
    document.addEventListener('mousedown', createClickOutsideHandler(temperatureInfoRef, setShowTemperatureInfo));
    
    // API key modal
    document.addEventListener('mousedown', createClickOutsideHandler(apiKeyModalRef, setShowApiKeyModal));
    
    // Custom model form
    document.addEventListener('mousedown', createClickOutsideHandler(customModelFormRef, setShowCustomModelForm));
    
    return () => {
      document.removeEventListener('mousedown', createClickOutsideHandler(settingsMenuRef, setShowSettingsMenu));
      document.removeEventListener('mousedown', createClickOutsideHandler(exportMenuRef, setShowExportMenu));
      document.removeEventListener('mousedown', createClickOutsideHandler(temperatureInfoRef, setShowTemperatureInfo));
      document.removeEventListener('mousedown', createClickOutsideHandler(apiKeyModalRef, setShowApiKeyModal));
      document.removeEventListener('mousedown', createClickOutsideHandler(customModelFormRef, setShowCustomModelForm));
    };
  }, []);
  
  // Add mouse move and up handlers for resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingLeft) {
        // Resize left panel
        const newWidth = e.clientX;
        if (newWidth >= 100 && newWidth <= 400) {
          setLeftPanelWidth(newWidth);
        }
      } else if (isDraggingRight) {
        // Resize right panel
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 100 && newWidth <= 500) {
          setRightPanelWidth(newWidth);
        }
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };
    
    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight]);
  
  // Save panel widths to localStorage
  useEffect(() => {
    if (!isDraggingLeft) { // Only save when dragging stops
      localStorage.setItem('leftPanelWidth', leftPanelWidth.toString());
    }
  }, [leftPanelWidth, isDraggingLeft]);
  
  useEffect(() => {
    if (!isDraggingRight) { // Only save when dragging stops
      localStorage.setItem('rightPanelWidth', rightPanelWidth.toString());
    }
  }, [rightPanelWidth, isDraggingRight]);
  
  /**
   * Toggle dark mode
   */
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };
  
  /**
   * Handle left resizer mouse down
   * @param {Event} e - The mouse event
   */
  const handleLeftResizerMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingLeft(true);
  };
  
  /**
   * Handle right resizer mouse down
   * @param {Event} e - The mouse event
   */
  const handleRightResizerMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingRight(true);
  };
  
  /**
   * Show a notification
   * @param {string} message - The notification message
   * @param {string} type - The notification type ('success', 'error', 'info')
   */
  const showNotification = (message, type = 'success') => {
    const id = Date.now(); // Use timestamp as unique ID
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, 5000);
  };
  
  return {
    // State
    isDarkMode,
    sidebarOpen,
    activeSidebarTab,
    leftPanelWidth,
    rightPanelWidth,
    activeTab,
    isDraggingLeft,
    isDraggingRight,
    showSettingsMenu,
    showExportMenu,
    showTemperatureInfo,
    showApiKeyModal,
    showCustomModelForm,
    notifications,
    
    // Refs
    settingsMenuRef,
    exportMenuRef,
    temperatureInfoRef,
    apiKeyModalRef,
    customModelFormRef,
    leftResizeRef,
    rightResizeRef,
    
    // State setters
    setSidebarOpen,
    setActiveSidebarTab,
    setActiveTab,
    setShowSettingsMenu,
    setShowExportMenu,
    setShowTemperatureInfo,
    setShowApiKeyModal,
    setShowCustomModelForm,
    
    // Functions
    toggleDarkMode,
    handleLeftResizerMouseDown,
    handleRightResizerMouseDown,
    showNotification
  };
}; 