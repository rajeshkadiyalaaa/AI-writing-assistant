import React, { useState, useEffect, useRef } from 'react';
import { 
  PenTool, Save, Download, History, Settings, 
  Trash2, Check, RefreshCw, Send, FileText, 
  BookOpen, Mail, Edit3, ChevronDown, Loader,
  MessageCircle, Bot, Info, Plus, Key, Eye, EyeOff,
  AlertCircle, Copy, Shield, AlertTriangle, Moon, Sun,
  Cpu, ThumbsUp, ThumbsDown
} from 'lucide-react';
import axios from 'axios';
// Import Framer Motion for animations
import { motion, AnimatePresence } from 'framer-motion';

// Animation variants for different UI elements
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
};

const slideInFromRight = {
  hidden: { x: 20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }
};

const slideInFromLeft = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }
};

const popIn = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1
    }
  }
};

export default function AIWritingAssistant() {
  const [content, setContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [documentType, setDocumentType] = useState('general');
  const [tone, setTone] = useState('professional');
  const [model, setModel] = useState('nvidia/llama-3.1-nemotron-nano-8b-v1:free');
  const [temperature, setTemperature] = useState(0.7);
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState('format');
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [activeTab, setActiveTab] = useState('editor');
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingSpeed] = useState(5); // ms per character - removed setter as it's unused
  const [fullResponse, setFullResponse] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [tokenUsage, setTokenUsage] = useState({ total: 0, lastRequest: 0 });
  const [showUsageStats, setShowUsageStats] = useState(false);
  const [showCustomModelForm, setShowCustomModelForm] = useState(false);
  const [customModelId, setCustomModelId] = useState('');
  const [customModelName, setCustomModelName] = useState('');
  const [isVerifyingModel, setIsVerifyingModel] = useState(false);
  const [showTemperatureInfo, setShowTemperatureInfo] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  // New state variables for API key management
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [isUpdatingApiKey, setIsUpdatingApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  // Add state for API key modal
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  // New state variables for enhanced API key features
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success', 'error', 'info'
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyTestSuccess, setApiKeyTestSuccess] = useState(false);
  const [rememberKey, setRememberKey] = useState(true);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  
  // Dark Mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first, then use system preference as fallback
    const savedMode = localStorage.getItem('dark_mode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    // If no saved preference, use system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // Panel resizing state
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem('leftPanelWidth');
    return saved ? parseInt(saved, 10) : 256; // Default to 256px if not saved
  });
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    const saved = localStorage.getItem('rightPanelWidth');
    return saved ? parseInt(saved, 10) : 288; // Default to 288px if not saved
  });
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const leftResizeRef = useRef(null);
  const rightResizeRef = useRef(null);
  
  const chatEndRef = useRef(null);
  const exportMenuRef = useRef(null);
  const usageStatsRef = useRef(null);
  const temperatureInfoRef = useRef(null);
  const modelInfoRef = useRef(null);
  const customModelFormRef = useRef(null);
  const settingsMenuRef = useRef(null);
  const apiKeyModalRef = useRef(null);
  const securityInfoRef = useRef(null);
  
  const [savedDocuments, setSavedDocuments] = useState([
    { id: 1, title: 'Project Proposal', date: '2025-04-08', type: 'business', content: 'This is a sample project proposal document.' },
    { id: 2, title: 'Research Notes', date: '2025-04-07', type: 'academic', content: 'These are sample research notes for an academic paper.' }
  ]);

  // Conversation starters for the chat
  const conversationStarters = [
    "Can you help me brainstorm some ideas for my project?",
    "What's the best way to start an email to a potential client?",
    "I need help structuring my essay. Any suggestions?",
    "Could you explain complex technical concepts in simple terms?",
    "How can I make my writing more engaging?"
  ];

  // Document types with icons
  const documentTypes = [
    { id: 'general', name: 'General', icon: <FileText size={16} /> },
    { id: 'email', name: 'Email', icon: <Mail size={16} /> },
    { id: 'academic', name: 'Academic', icon: <BookOpen size={16} /> },
    { id: 'business', name: 'Business', icon: <PenTool size={16} /> },
    { id: 'creative', name: 'Creative', icon: <Edit3 size={16} /> }
  ];

  // Tone options
  const toneOptions = [
    'professional', 'casual', 'formal', 'friendly', 
    'persuasive', 'informative', 'entertaining'
  ];

  // LLM Models with display names and strengths - now using a proper React state variable
  const [modelOptions, setModelOptions] = useState(() => {
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
  });

  // Get recommended model for current document type
  const getRecommendedModel = (docType) => {
    // Find models that are strong in this document type
    const recommendedModels = modelOptions.filter(m => m.strengths.includes(docType));
    
    // Return the first recommended model or the first model in the list as fallback
    return recommendedModels.length > 0 ? recommendedModels[0] : modelOptions[0];
  };

  // Function to check if a model is recommended for current document type
  const isRecommendedModel = (modelId) => {
    return modelOptions.some(m => m.id === modelId && m.strengths.includes(documentType));
  };
  
  // Finish typing animation and add the message to the chat
  const finishTypingAnimation = () => {
    // Update the last message with the full text
    const updatedMessages = [...chatMessages];
    if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].isTyping) {
      updatedMessages[updatedMessages.length - 1] = {
        role: 'assistant',
        content: fullResponse
      };
      setChatMessages(updatedMessages);
    }
    setFullResponse('');
    setTypingText('');
  };

  // Update model when document type changes
  useEffect(() => {
    const recommendedModel = getRecommendedModel(documentType);
    
    // Only update the model silently, don't show a popup
    // The user can manually change models through the settings
    if (!isRecommendedModel(model)) {
      // Instead of showing a popup, just display a subtle indication in the UI
      // that there's a recommended model for this content type
      console.log(`${recommendedModel.name} is recommended for ${documentType} documents`);
      
      // Don't automatically change the model or show confirmation
      // setModel(recommendedModel.id);
      // Don't clear chat messages either
      // setChatMessages([]);
    }
  }, [documentType]);

  // Typing animation effect
  useEffect(() => {
    if (isTyping && fullResponse) {
      if (typingText.length < fullResponse.length) {
        const timeout = setTimeout(() => {
          setTypingText(fullResponse.substring(0, typingText.length + 1));
        }, typingSpeed);
        return () => clearTimeout(timeout);
      } else {
        setIsTyping(false);
        finishTypingAnimation();
      }
    }
  }, [typingText, isTyping, fullResponse, typingSpeed, finishTypingAnimation]);

  // Auto-scroll to the bottom of chat when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, typingText]);

  // Add click outside handler for settings menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setShowSettingsMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsMenuRef]);

  // Function to call the backend API for AI response
  const generateAIResponse = async () => {
    if (!messageInput.trim()) return;
    
    // Add user message to chat
    const userMessage = { role: 'user', content: messageInput };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setMessageInput('');
    
    try {
      setIsGenerating(true);
      
      // Add a temporary typing indicator message
      const messagesWithTyping = [...updatedMessages, { role: 'assistant', isTyping: true, content: '' }];
      setChatMessages(messagesWithTyping);
      
      // Call backend API with the current document type and tone settings
      const response = await axios.post('/api/generate', {
        messages: updatedMessages,
        model: model,
        documentType: documentType, // Use selected document type instead of hardcoded value
        tone: tone, // Use selected tone instead of hardcoded value
        temperature: temperature // Add temperature parameter
      });
      
      // Get the response text
      const responseText = response.data.response || "I'm not sure how to respond to that. Can you try rephrasing?";
      
      // Update token usage estimate
      updateTokenUsage(updatedMessages.length, responseText);
      
      // Start the animation with the typing indicator still in the chat
      setFullResponse(responseText);
      setTypingText('');
      setIsTyping(true);
      
      // Add to history
      const now = new Date();
      setHistory([...history, {
        id: history.length + 1,
        timestamp: now.toLocaleTimeString(),
        action: `Chat with ${getModelDisplayName(model)} (${documentType}, ${tone})`,
        version: history.length + 1
      }]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Add error message to chat
      setChatMessages([...updatedMessages, {
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to insert a conversation starter
  const selectConversationStarter = (starter) => {
    setMessageInput(starter);
  };

  // Function to convert suggestions object to array if needed
  const normalizeSuggestions = (suggestionData) => {
    console.log('Raw suggestion data:', suggestionData);
    
    if (!suggestionData) {
      console.log('No suggestion data provided');
      return [];
    }
    
    // If it's already an array, return it
    if (Array.isArray(suggestionData)) {
      console.log('Suggestion data is already an array');
      return suggestionData;
    }
    
    // If it's a categorized object (from the Python script), convert to array
    if (typeof suggestionData === 'object') {
      console.log('Normalizing object-based suggestions');
      const result = [];
      let idCounter = 1;
      
      // Process each category
      Object.entries(suggestionData).forEach(([category, items]) => {
        console.log(`Processing category: ${category}, items:`, items);
        if (Array.isArray(items)) {
          items.forEach(text => {
            result.push({
              id: idCounter++,
              type: mapCategoryToType(category),
              text: text
            });
          });
        }
      });
      
      console.log('Normalized suggestions:', result);
      return result;
    }
    
    // Handle string response case (sometimes the API returns a raw string)
    if (typeof suggestionData === 'string') {
      console.log('Suggestion data is a string, creating a single suggestion');
      return [{
        id: 1,
        type: 'improvement',
        text: suggestionData
      }];
    }
    
    console.log('Unhandled suggestion data type, returning empty array');
    return [];
  };
  
  // Map backend categories to frontend types
  const mapCategoryToType = (category) => {
    const typeMap = {
      'grammar': 'grammar',
      'style': 'improvement',
      'structure': 'improvement',
      'content': 'alternative',
      'clarity': 'improvement',
      'other': 'improvement'
    };
    
    return typeMap[category] || 'improvement';
  };

  // Function to generate suggestions
  const generateSuggestions = async () => {
    if (!content.trim()) return;
    
    setIsGenerating(true);
    
    try {
      // If no API key is set, show demo suggestions immediately
      if (!apiKeySet) {
        console.log("No API key set, showing demo suggestions");
        setSuggestions(generateDemoSuggestions());
        showNotification('API key required for actual suggestions', 'warning');
        return;
      }
      
      console.log("Sending request to generate suggestions...");
      // Call backend API for suggestions
      const response = await axios.post('/api/suggestions', {
        content: content,
        documentType: documentType,
        tone: tone,
        model: model
      });
      
      console.log("Response received:", response.data);
      
      // Check if there's an error in the response
      if (response.data.error) {
        // Handle authentication errors specifically
        if (response.data.error.includes("Authentication failed") || 
            response.data.error.includes("401") || 
            (response.data.details && response.data.details.includes("API key"))) {
          console.error('Authentication error:', response.data.error);
          showNotification('API key invalid or expired. Please update your API key.', 'error');
          
          // Use demo suggestions
          setSuggestions(generateDemoSuggestions());
          
          // Prompt user to update their API key
          setTimeout(() => {
            setShowApiKeyModal(true);
          }, 1000);
          
          throw new Error('Authentication failed. Please update your API key.');
        }
        
        throw new Error(response.data.error);
      }
      
      // Handle the response, normalizing the suggestions data
      try {
        // Check if we have structured suggestions or raw suggestions
        let suggestionsData = response.data.suggestions;
        
        if (!suggestionsData && response.data.raw_suggestions) {
          console.log('Using raw suggestions as fallback');
          // Try to manually parse from raw suggestions if structured parsing failed
          suggestionsData = {
            'improvement': [response.data.raw_suggestions]
          };
        }
        
        // For fallback case when backend returns example suggestions directly
        if (!suggestionsData && Array.isArray(response.data) && response.data.length > 0) {
          console.log('API returned direct array of suggestions');
          setSuggestions(response.data);
          return;
        }
        
        const normalizedSuggestions = normalizeSuggestions(suggestionsData);
        console.log('Normalized suggestions:', normalizedSuggestions);
        
        if (normalizedSuggestions.length === 0) {
          console.log('No suggestions were generated, using fallback');
          setSuggestions([
            { 
              id: Date.now(), 
              type: 'improvement', 
              text: 'The system couldn\'t generate specific suggestions. Try providing more context or a longer piece of text.' 
            }
          ]);
        } else {
          setSuggestions(normalizedSuggestions);
        }
        
        // Add to history
        const now = new Date();
        setHistory([...history, {
          id: history.length + 1,
          timestamp: now.toLocaleTimeString(),
          action: `Generated suggestions with ${getModelDisplayName(model)}`,
          version: history.length + 1
        }]);
      } catch (processingError) {
        console.error('Error processing suggestions response:', processingError);
        showNotification('Error processing suggestions. Please try again.', 'error');
        
        // Use demo suggestions as fallback
        setSuggestions(generateDemoSuggestions());
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Show error as a toast notification
      showNotification(`Error generating suggestions: ${error.message || 'Unknown error'}`, 'error');
      
      // Fallback with demo suggestions if not already set
      if (suggestions.length === 0) {
        setSuggestions(generateDemoSuggestions());
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to improve writing
  const improveWriting = async () => {
    if (!content.trim()) return;
    
    setIsGenerating(true);
    
    try {
      // If no API key is set, show notification immediately
      if (!apiKeySet) {
        console.log("No API key set, cannot improve writing");
        showNotification('API key required to improve writing', 'warning');
        
        // Add API key required suggestion
        setSuggestions([
          ...suggestions,
          {
            id: Date.now(),
            type: 'grammar',
            text: 'API key required: Please update your API key to use the improve writing feature.'
          }
        ]);
        
        // Prompt user to update their API key
        setTimeout(() => {
          setShowApiKeyModal(true);
        }, 1000);
        
        return;
      }
      
      console.log("Sending request to improve writing...");
      // Call backend API to improve the writing
      const response = await axios.post('/api/improve', {
        content: content,
        targetAudience: documentType,
        readingLevel: tone === 'academic' ? 'advanced' : tone === 'technical' ? 'advanced' : 'intermediate',
        additionalInstructions: `Use a ${tone} tone.`,
        model: model
      });
      
      console.log("Response received:", response.data);
      
      // Check if there's an error in the response
      if (response.data.error) {
        // Handle authentication errors specifically
        if (response.data.error.includes("Authentication failed") || 
            response.data.error.includes("401") || 
            (response.data.details && response.data.details.includes("API key"))) {
          console.error('Authentication error:', response.data.error);
          showNotification('API key invalid or expired. Please update your API key.', 'error');
          
          // Add API key error suggestion
          setSuggestions([
            ...suggestions,
            {
              id: Date.now(),
              type: 'grammar',
              text: 'Authentication failed: Please update your API key to use the improve writing feature.'
            }
          ]);
          
          // Prompt user to update their API key
          setTimeout(() => {
            setShowApiKeyModal(true);
          }, 1000);
          
          throw new Error('Authentication failed. Please update your API key.');
        }
        
        throw new Error(response.data.error);
      }
      
      if (response.data.improved_content) {
        // Create a backup of current content
        const previousContent = content;
        
        // Update the content with improved version
        setContent(response.data.improved_content);
        
        // Add to history
        const now = new Date();
        setHistory([...history, {
          id: history.length + 1,
          timestamp: now.toLocaleTimeString(),
          action: `Improved writing with ${getModelDisplayName(model)}`,
          version: history.length + 1
        }]);
        
        // Add improvement as a suggestion that can be dismissed
        setSuggestions([
          ...suggestions,
          {
            id: Date.now(),
            type: 'improvement',
            text: 'Content has been improved. You can continue editing or revert to the original version.',
            originalContent: previousContent
          }
        ]);
        
        // Show success notification
        showNotification('Content has been improved successfully!', 'success');
      } else {
        throw new Error('No improved content received from the server');
      }
    } catch (error) {
      console.error('Error improving writing:', error);
      
      // Show error as a toast notification
      showNotification(`Error improving writing: ${error.message || 'Unknown error'}`, 'error');
      
      // Only add error suggestion if not already added for API key issues
      if (!error.message.includes('API key') && !error.message.includes('Authentication')) {
        // Add improvement error as a suggestion
        setSuggestions([
          ...suggestions,
          {
            id: Date.now(),
            type: 'grammar',
            text: 'Unable to improve writing. Please try again or check your content.'
          }
        ]);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to apply a suggestion
  const applySuggestion = (id) => {
    const suggestion = suggestions.find(s => s.id === id);
    if (suggestion && suggestion.type === 'alternative') {
      // For demo purposes, just append the suggestion text
      setContent(content + '\n\n' + suggestion.text);
    } else if (suggestion && suggestion.originalContent) {
      // If it's a suggestion with original content (after improving writing)
      setContent(suggestion.originalContent);
    }
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  // Handle export options
  const handleExport = (format) => {
    if (!content.trim()) {
      alert('Please add some content before exporting.');
      return;
    }
    
    // Create a blob with the content
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    
    // Create filename with title and appropriate extension
    let filename = documentTitle.replace(/\s+/g, '_');
    
    if (format === 'markdown') {
      // For markdown, just download the content as .md file
      filename += '.md';
      downloadFile(blob, filename);
    } 
    else if (format === 'pdf') {
      // For PDF, we need to use a service or library
      // Since we can't directly create PDFs in the browser,
      // we'll use a simple HTML-to-PDF approach
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${documentTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #333; }
            pre { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>${documentTitle}</h1>
          <pre>${content}</pre>
        </body>
        </html>
      `;
      
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      filename += '.html';
      
      // For demo purposes, we'll download HTML instead of PDF
      // In a real app, you'd use a library like jsPDF or a backend service
      downloadFile(htmlBlob, filename);
      
      // Show info about PDF limitations
      setTimeout(() => {
        alert('Note: For true PDF export, the application would need a PDF generation library like jsPDF or a backend service. The content has been downloaded as HTML for demonstration.');
      }, 500);
    } 
    else if (format === 'docx') {
      // For DOCX, we'd need a library like docx.js or a backend service
      // For demo, we'll download the content as a text file
      filename += '.txt';
      downloadFile(blob, filename);
      
      // Show info about DOCX limitations
      setTimeout(() => {
        alert('Note: For true DOCX export, the application would need a library like docx.js or a backend service. The content has been downloaded as a text file for demonstration.');
      }, 500);
    }
  };
  
  // Helper function to download a file
  const downloadFile = (blob, filename) => {
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Append to the document body, click it, and remove it
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Function to create a new document
  const createNewDocument = () => {
    // First check if there are unsaved changes
    if (content.trim() && !savedDocuments.some(doc => doc.title === documentTitle && doc.content === content)) {
      const confirmDiscard = window.confirm('You have unsaved changes. Create a new document anyway?');
      if (!confirmDiscard) return;
    }
    
    // Reset document fields
    setDocumentTitle('Untitled Document');
    setContent('');
    setSuggestions([]);
    
    // Set active tab to editor
    setActiveTab('editor');
    
    // Add to history
    const now = new Date();
    setHistory([...history, {
      id: history.length + 1,
      timestamp: now.toLocaleTimeString(),
      action: 'Created new document',
      version: 1
    }]);
  };

  // Function to delete a saved document
  const deleteDocument = (id) => {
    const documentToDelete = savedDocuments.find(doc => doc.id === id);
    
    if (documentToDelete) {
      const confirmDelete = window.confirm(`Are you sure you want to delete "${documentToDelete.title}"?`);
      
      if (confirmDelete) {
        setSavedDocuments(savedDocuments.filter(doc => doc.id !== id));
        
        // Add to history
        const now = new Date();
        setHistory([...history, {
          id: history.length + 1,
          timestamp: now.toLocaleTimeString(),
          action: `Deleted document "${documentToDelete.title}"`,
          version: history.length + 1
        }]);
      }
    }
  };

  // Function to load a saved document
  const loadDocument = (id) => {
    const documentToLoad = savedDocuments.find(doc => doc.id === id);
    
    if (documentToLoad) {
      // Check for unsaved changes
      if (content.trim() && !savedDocuments.some(doc => doc.title === documentTitle && doc.content === content)) {
        const confirmDiscard = window.confirm('You have unsaved changes. Load another document anyway?');
        if (!confirmDiscard) return;
      }
      
      // Load the document content
      setDocumentTitle(documentToLoad.title);
      setContent(documentToLoad.content || '');
      setDocumentType(documentToLoad.type);
      setSuggestions([]);
      
      // Set active tab to editor
      setActiveTab('editor');
      
      // Add to history
      const now = new Date();
      setHistory([...history, {
        id: history.length + 1,
        timestamp: now.toLocaleTimeString(),
        action: `Loaded document "${documentToLoad.title}"`,
        version: history.length + 1
      }]);
    }
  };

  // Handle save document
  const saveDocument = () => {
    if (!content.trim()) {
      alert('Cannot save empty document. Please add some content first.');
      return;
    }
    
    // Check if we're updating an existing document
    const existingDocIndex = savedDocuments.findIndex(doc => doc.title === documentTitle);
    
    if (existingDocIndex >= 0) {
      // Update existing document
      const updatedDocuments = [...savedDocuments];
      updatedDocuments[existingDocIndex] = {
        ...updatedDocuments[existingDocIndex],
        content: content,
        date: new Date().toISOString().split('T')[0],
        type: documentType
      };
      
      setSavedDocuments(updatedDocuments);
      alert(`Document "${documentTitle}" updated successfully!`);
    } else {
      // Create new document
      const newDocument = {
        id: Date.now(),
        title: documentTitle,
        content: content,
        date: new Date().toISOString().split('T')[0],
        type: documentType
      };
      
      setSavedDocuments([...savedDocuments, newDocument]);
      alert(`Document "${documentTitle}" saved successfully!`);
    }
    
    // Add to history
    const now = new Date();
    setHistory([...history, {
      id: history.length + 1,
      timestamp: now.toLocaleTimeString(),
      action: `Saved document "${documentTitle}"`,
      version: history.length + 1
    }]);
  };

  // Function to get model display name
  const getModelDisplayName = (modelId) => {
    const modelOption = modelOptions.find(m => m.id === modelId);
    return modelOption ? modelOption.name : modelId;
  };

  // Function to clear the chat
  const clearChat = () => {
    setChatMessages([]);
  };

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close usage stats when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (usageStatsRef.current && !usageStatsRef.current.contains(event.target)) {
        setShowUsageStats(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close temperature info tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (temperatureInfoRef.current && !temperatureInfoRef.current.contains(event.target)) {
        setShowTemperatureInfo(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close model info tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (modelInfoRef.current && !modelInfoRef.current.contains(event.target)) {
        setShowModelInfo(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close custom model form when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (customModelFormRef.current && !customModelFormRef.current.contains(event.target)) {
        setShowCustomModelForm(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close API key modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (apiKeyModalRef.current && !apiKeyModalRef.current.contains(event.target)) {
        setShowApiKeyModal(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close security info when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (securityInfoRef.current && !securityInfoRef.current.contains(event.target)) {
        setShowSecurityInfo(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Panel resizing handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingLeft) {
        const newWidth = Math.max(180, Math.min(400, e.clientX));
        setLeftPanelWidth(newWidth);
      } else if (isDraggingRight) {
        const newWidth = Math.max(200, Math.min(500, window.innerWidth - e.clientX));
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection during dragging
      document.body.style.userSelect = 'none';
      // Add a custom cursor to the whole document while dragging
      document.body.style.cursor = 'ew-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDraggingLeft, isDraggingRight]);

  // Handle left resizer mouse down
  const handleLeftResizerMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingLeft(true);
  };

  // Handle right resizer mouse down
  const handleRightResizerMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingRight(true);
  };

  // Estimate token count from text (rough approximation)
  const estimateTokens = (text) => {
    if (!text) return 0;
    // A very simple approximation: average English word is ~1.3 tokens
    return Math.ceil(text.split(/\s+/).length * 1.3);
  };

  // Estimate cost based on tokens and model
  const estimateCost = (tokens, modelId) => {
    // Cost per 1000 tokens (approximate)
    const rates = {
      'nvidia/llama-3.1-nemotron-nano-8b-v1:free': 0.00, // Free
      'openrouter/quasar-alpha': 0.005,
      'google/gemini-2.5-pro-exp-03-25:free': 0.00, // Free
      'deepseek/deepseek-chat-v3-0324:free': 0.00 // Free
    };
    
    const rate = rates[modelId] || 0.001; // Default rate
    return (tokens / 1000) * rate;
  };

  // Update token usage
  const updateTokenUsage = (messageCount, responseLength) => {
    // Rough estimation
    const promptTokens = messageCount * 50; // Average tokens per message
    const responseTokens = estimateTokens(responseLength);
    const requestTotal = promptTokens + responseTokens;
    
    setTokenUsage(prev => ({
      total: prev.total + requestTotal,
      lastRequest: requestTotal
    }));
  };

  // Function to add a custom model
  const addCustomModel = async () => {
    if (!customModelId.trim() || !customModelName.trim()) {
      showNotification('Both Model ID and Display Name are required', 'error');
      return;
    }
    
    setIsVerifyingModel(true);
    
    try {
      // Verify the model by sending a test request
      const response = await axios.post('/api/verify-model', {
        model: customModelId
      });
      
      if (response.data.success) {
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
        setModelOptions(prevOptions => [...prevOptions, newModel]);
        
        // Switch to the new model
        setModel(customModelId);
        
        // Clear chat messages when model changes
        setChatMessages([]);
        
        // Hide the form
        setShowCustomModelForm(false);
        
        // Reset form
        setCustomModelId('');
        setCustomModelName('');
        
        // Ask if user wants to save the model permanently
        const shouldSave = window.confirm(
          `Successfully verified model: ${customModelName}. \n\nDo you want to save this model for future sessions? \n\nClick 'OK' to save or 'Cancel' to use only for the current session.`
        );
        
        if (shouldSave) {
          // Save custom models to localStorage
          const savedCustomModels = JSON.parse(localStorage.getItem('custom_models') || '[]');
          savedCustomModels.push(newModel);
          localStorage.setItem('custom_models', JSON.stringify(savedCustomModels));
          
          // Show confirmation with toast notification
          showNotification(`Model "${customModelName}" saved for future sessions`, 'success');
        } else {
          // Show success message without saving
          showNotification(`Model "${customModelName}" added for this session only`, 'info');
        }
      } else {
        throw new Error(response.data.error || 'Failed to verify model');
      }
    } catch (error) {
      console.error('Error verifying model:', error);
      showNotification(`Failed to verify model: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsVerifyingModel(false);
    }
  };

  // Function to remove a custom model
  const removeCustomModel = (modelId) => {
    const modelToRemove = modelOptions.find(m => m.id === modelId);
    
    if (!modelToRemove || !modelToRemove.custom) {
      showNotification('Only custom models can be removed', 'error');
      return;
    }
    
    const confirmRemove = window.confirm(`Are you sure you want to remove the model "${modelToRemove.name}"?`);
    
    if (confirmRemove) {
      // Remove from state using setState
      setModelOptions(prevOptions => prevOptions.filter(m => m.id !== modelId));
      
      // Remove from localStorage
      const savedCustomModels = JSON.parse(localStorage.getItem('custom_models') || '[]');
      const updatedCustomModels = savedCustomModels.filter(m => m.id !== modelId);
      localStorage.setItem('custom_models', JSON.stringify(updatedCustomModels));
      
      // If the current model was removed, switch to the first available model
      if (model === modelId) {
        // Get the updated model options
        const updatedOptions = modelOptions.filter(m => m.id !== modelId);
        if (updatedOptions.length > 0) {
          setModel(updatedOptions[0].id);
          setChatMessages([]); // Clear chat messages when model changes
        }
      }
      
      showNotification(`Model "${modelToRemove.name}" has been removed`, 'info');
    }
  };

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

  // Function to fetch the current API key (masked)
  const fetchApiKeyInfo = async () => {
    try {
      // Check if we have a key in localStorage
      const storedKey = localStorage.getItem('openrouter_api_key');
      
      if (storedKey) {
        // If we have a stored key, use it to get the masked version
        const response = await axios.post('/api/settings/apikey', {
          apiKey: storedKey
        });
        
        setMaskedApiKey(response.data.maskedKey);
        setApiKeySet(true);
      } else {
        // Otherwise, just check if the server has an API key set
        const response = await axios.get('/api/settings/apikey');
        setMaskedApiKey(response.data.maskedKey);
        setApiKeySet(response.data.isSet);
      }
    } catch (error) {
      console.error('Error fetching API key info:', error);
      setApiKeyError('Failed to load API key information');
    }
  };
  
  // Function to update the API key
  const updateApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyError('API key cannot be empty');
      return;
    }
    
    setIsUpdatingApiKey(true);
    setApiKeyError('');
    
    try {
      const response = await axios.post('/api/settings/apikey', {
        apiKey: apiKeyInput
      });
      
      setMaskedApiKey(response.data.maskedKey);
      setApiKeySet(true);
      
      // If remember key is checked, store in localStorage
      if (rememberKey) {
        localStorage.setItem('openrouter_api_key', apiKeyInput);
      } else {
        // Otherwise make sure it's removed from localStorage
        localStorage.removeItem('openrouter_api_key');
      }
      
      setApiKeyInput(''); // Clear input after successful update
      setShowApiKey(false); // Hide the input
      
      // Close the modal
      setShowApiKeyModal(false);
      
      // Show success message with toast instead of alert
      showNotification('API key updated successfully', 'success');
      
    } catch (error) {
      console.error('Error updating API key:', error);
      setApiKeyError(error.response?.data?.error || 'Failed to update API key');
      showNotification('Failed to update API key: ' + (error.response?.data?.error || 'Unknown error'), 'error');
    } finally {
      setIsUpdatingApiKey(false);
    }
  };

  // Function to test the API key before saving
  const testApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyError('API key cannot be empty');
      return;
    }
    
    if (!apiKeyInput.startsWith('sk-or-')) {
      setApiKeyError('Invalid API key format. OpenRouter API keys should start with sk-or-');
      return;
    }
    
    setIsTestingApiKey(true);
    setApiKeyError('');
    
    try {
      console.log('Testing OpenRouter API key...');
      
      // Use the verify-model endpoint since we're already using it for other purposes
      const response = await axios.post('/api/verify-model', {
        apiKey: apiKeyInput,
        model: 'nvidia/llama-3.1-nemotron-nano-8b-v1:free' // Use free model for testing
      });
      
      if (response.data.success) {
        console.log('API key validation successful');
        setApiKeyTestSuccess(true);
        showNotification('API key is valid!', 'success');
        setTimeout(() => setApiKeyTestSuccess(false), 3000);
      } else {
        console.error('API key validation failed:', response.data.error || 'Unknown error');
        setApiKeyError('API key validation failed: ' + (response.data.error || 'Unknown error'));
        showNotification('API key validation failed', 'error');
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      
      // Check for specific error types
      if (error.response && error.response.status === 401) {
        setApiKeyError('Authentication failed: This API key is invalid or has expired. Please generate a new key at openrouter.ai/keys');
        showNotification('Invalid API key. Please get a new one from OpenRouter.', 'error');
      } else if (error.response && error.response.status === 404) {
        setApiKeyError('API endpoint not found. Please check if the OpenRouter API URL has changed.');
        showNotification('API connection issue. Try again later.', 'error');
      } else {
        setApiKeyError('Failed to validate API key: ' + (error.response?.data?.error || error.message));
        showNotification('Failed to validate API key', 'error');
      }
    } finally {
      setIsTestingApiKey(false);
    }
  };

  // Fetch the API key info when component mounts
  useEffect(() => {
    fetchApiKeyInfo();
  }, []);

  // Helper function to show toast notifications
  const showNotification = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Helper function to copy to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Toggle dark mode and save preference
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('dark_mode', newMode.toString());
    showNotification(`${newMode ? 'Dark' : 'Light'} mode activated`, 'info');
  };

  // Helper function to generate demo suggestions when API is not working
  const generateDemoSuggestions = () => {
    return [
      { id: 1, type: 'improvement', text: 'This is a demo suggestion since the OpenRouter API is not connected. Please update your API key to get real AI-powered suggestions.' },
      { id: 2, type: 'alternative', text: 'Demo alternative: "Implementing this system could significantly improve productivity and streamline operations."' },
      { id: 3, type: 'grammar', text: 'Demo grammar suggestion: Check punctuation and capitalization in your document.' }
    ];
  };

  // Function to display a helpful prompt to fix API issues
  const renderApiKeyPrompt = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`mb-4 p-4 rounded-lg border ${
          isDarkMode 
            ? 'bg-yellow-900/30 border-yellow-800 text-yellow-200' 
            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
        }`}
      >
        <div className="flex items-start">
          <AlertTriangle className="mr-3 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-medium mb-1">API Key Required</p>
            <p className="text-sm mb-2">
              The OpenRouter API key is invalid or missing. To use AI features, please:
            </p>
            <ol className="text-sm list-decimal ml-5 mb-2 space-y-1">
              <li>Get a free API key from <a 
                href="https://openrouter.ai/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`underline font-medium ${
                  isDarkMode ? 'text-yellow-300 hover:text-yellow-200' : 'text-yellow-700 hover:text-yellow-900'
                }`}
              >openrouter.ai/keys</a></li>
              <li>Click the Settings button in the top bar</li>
              <li>Select "Update" next to API Key</li>
              <li>Enter and save your new API key</li>
            </ol>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowApiKeyModal(true)}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              isDarkMode 
                ? 'bg-yellow-700 hover:bg-yellow-600 text-white' 
                : 'bg-yellow-500 hover:bg-yellow-600 text-white'
            }`}
          >
            <Key size={14} className="inline mr-1" />
            Update API Key
          </motion.button>
        </div>
      </motion.div>
    );
  };

  // Function to handle suggestion feedback
  const handleSuggestionFeedback = (id, isHelpful) => {
    // Find the suggestion by ID
    const suggestion = suggestions.find(s => s.id === id);
    if (!suggestion) return;
    
    // Log the feedback for later analysis
    console.log(`User rated suggestion as ${isHelpful ? 'helpful' : 'not helpful'}:`, suggestion);
    
    // In a production app, you would send this to your backend
    // For now, we'll just update the UI
    const updatedSuggestions = suggestions.map(s => {
      if (s.id === id) {
        return {
          ...s,
          rated: true,
          wasHelpful: isHelpful
        };
      }
      return s;
    });
    
    setSuggestions(updatedSuggestions);
    
    // Store feedback in localStorage for personalization
    try {
      const storedFeedback = JSON.parse(localStorage.getItem('suggestionFeedback') || '{}');
      storedFeedback[suggestion.type] = storedFeedback[suggestion.type] || { helpful: 0, unhelpful: 0 };
      
      if (isHelpful) {
        storedFeedback[suggestion.type].helpful += 1;
      } else {
        storedFeedback[suggestion.type].unhelpful += 1;
      }
      
      localStorage.setItem('suggestionFeedback', JSON.stringify(storedFeedback));
    } catch (e) {
      console.error('Error storing feedback:', e);
    }
    
    // Show feedback notification
    showNotification(`Thank you for your feedback on this ${suggestion.type} suggestion!`, 'success');
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'} ${(isDraggingLeft || isDraggingRight) ? 'no-select' : ''}`}>
      {/* Warning banner when no API key is set */}
      <AnimatePresence>
      {!apiKeySet && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`fixed top-0 left-0 right-0 ${isDarkMode ? 'bg-yellow-800 text-yellow-100' : 'bg-yellow-100 text-yellow-800'} px-4 py-2 text-sm flex items-center justify-center z-50`}
          >
          <AlertTriangle size={16} className="mr-2" />
          No OpenRouter API key set. Some features may not work properly.
          <button
            onClick={() => setShowApiKeyModal(true)}
            className={`ml-3 underline font-medium ${isDarkMode ? 'text-yellow-100' : 'text-yellow-800'}`}
          >
            Set API Key
          </button>
          </motion.div>
      )}
      </AnimatePresence>
      
      {/* Sidebar with dynamic width */}
      <motion.div 
        className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r transition-all relative flex-shrink-0 resizable-panel`}
        style={{ width: sidebarOpen ? `${leftPanelWidth}px` : '64px' }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        layout
      >
        <div className="flex flex-col h-full">
          {/* App Logo & Title */}
          <div className={`p-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} border-b flex items-center justify-between`}>
            <div className="flex items-center">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
              <PenTool className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </motion.div>
              {sidebarOpen && <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-2 font-bold"
              >AI Writer</motion.span>}
            </div>
            <motion.button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <ChevronDown className={`transform ${sidebarOpen ? 'rotate-180' : ''}`} size={16} />
            </motion.button>
          </div>

          {/* Sidebar Tabs */}
          <div className={`flex ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
            <motion.button 
              whileHover={{ backgroundColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(243, 244, 246, 0.7)' }}
              whileTap={{ scale: 0.97 }}
              className={`flex-1 p-3 text-xs ${
                activeSidebarTab === 'format' 
                  ? isDarkMode ? 'bg-gray-700' : 'bg-gray-100' 
                  : ''
              }`}
              onClick={() => setActiveSidebarTab('format')}
            >
              {sidebarOpen ? 'Format & Style' : <Settings size={16} className="mx-auto" />}
            </motion.button>
            <motion.button 
              whileHover={{ backgroundColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(243, 244, 246, 0.7)' }}
              whileTap={{ scale: 0.97 }}
              className={`flex-1 p-3 text-xs ${
                activeSidebarTab === 'history' 
                  ? isDarkMode ? 'bg-gray-700' : 'bg-gray-100' 
                  : ''
              }`}
              onClick={() => setActiveSidebarTab('history')}
            >
              {sidebarOpen ? 'History' : <History size={16} className="mx-auto" />}
            </motion.button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
            {activeSidebarTab === 'format' && sidebarOpen && (
                <motion.div 
                  key="format-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-4"
                >
                {/* Document Type */}
                  <motion.div 
                    className="mb-4"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.label variants={fadeIn} className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : ''}`}>Document Type</motion.label>
                    <motion.select 
                      variants={fadeIn}
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className={`w-full p-2 border rounded-md text-sm ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'border-gray-300'
                    }`}
                  >
                    {documentTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                    </motion.select>
                  </motion.div>

                {/* Tone */}
                  <motion.div 
                    className="mb-4"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.label variants={fadeIn} className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : ''}`}>Tone</motion.label>
                    <motion.select 
                      variants={fadeIn}
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className={`w-full p-2 border rounded-md text-sm ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'border-gray-300'
                    }`}
                  >
                    {toneOptions.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                    </motion.select>
                  </motion.div>

                {/* Model Selection */}
                  <motion.div 
                    className="mb-4"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.label variants={fadeIn} className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : ''}`}>
                    AI Model
                      <motion.button
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      onClick={() => setShowModelInfo(!showModelInfo)}
                      className={`ml-1 ${isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
                      aria-label="Model information"
                    >
                      <Info size={14} />
                      </motion.button>
                    
                      <AnimatePresence>
                    {showModelInfo && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ type: "spring", damping: 20 }}
                        ref={modelInfoRef}
                        className={`absolute mt-1 w-64 rounded-md shadow-lg z-20 p-3 border text-xs ${
                          isDarkMode 
                            ? 'bg-gray-800 border-gray-700 text-gray-300' 
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        <h4 className="font-semibold mb-1">About AI Models</h4>
                        <p className="mb-2">Different AI models have various specialties and capabilities:</p>
                        <ul className="list-disc pl-4 space-y-1 mb-2">
                          <li><span className="font-medium">General models</span> are balanced for various tasks</li>
                          <li><span className="font-medium">Specialized models</span> excel at specific document types</li>
                          <li><span className="font-medium">Free models</span> are available at no cost but may have limitations</li>
                          <li><span className="font-medium">Custom models</span> are your own specified models</li>
                        </ul>
                        <p>Models marked with ✓ are recommended for your current document type.</p>
                          </motion.div>
                    )}
                      </AnimatePresence>
                    </motion.label>
                    <motion.div variants={fadeIn} className="mb-2">
                    <select 
                      value={model}
                      onChange={(e) => {
                        setModel(e.target.value);
                        // Clear chat messages when model changes
                        setChatMessages([]);
                      }}
                      className={`w-full p-2 border rounded-md text-sm ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border-gray-300'
                      }`}
                    >
                      {/* Default Models Group */}
                      <optgroup label="Default Models">
                        {modelOptions.filter(m => !m.custom).map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.strengths.includes(documentType) ? "✓" : ""}
                          {m.free ? " (free)" : ""}
                        </option>
                      ))}
                      </optgroup>
                      
                      {/* Custom Models Group - only show if there are custom models */}
                      {modelOptions.some(m => m.custom) && (
                        <optgroup label="Custom Models">
                          {modelOptions.filter(m => m.custom).map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} (custom)
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    </motion.div>
                  
                    <motion.div variants={fadeIn} className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Currently using: <span className="font-semibold">{getModelDisplayName(model)}</span>
                    {isRecommendedModel(model) && (
                      <span className={`ml-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>(Recommended for {documentTypes.find(t => t.id === documentType)?.name})</span>
                    )}
                    </motion.div>
                    <motion.div variants={fadeIn} className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {modelOptions.find(m => m.id === model)?.description}
                    </motion.div>
                  
                  {/* Show delete button for custom models */}
                    <AnimatePresence>
                  {modelOptions.find(m => m.id === model)?.custom && (
                        <motion.button
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                      onClick={() => removeCustomModel(model)}
                      className={`mt-2 px-2 py-1 rounded text-xs flex items-center ${
                        isDarkMode
                          ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      <Trash2 size={12} className="mr-1" />
                      Remove Custom Model
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  
                  {/* Temperature Slider */}
                  <motion.div 
                    className="mb-4"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.div variants={fadeIn} className="flex items-center justify-between mb-2">
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : ''}`}>
                        Temperature
                        <motion.button
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setShowTemperatureInfo(!showTemperatureInfo)}
                          className={`ml-1 ${isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
                          aria-label="Temperature information"
                        >
                          <Info size={14} />
                        </motion.button>
                      </label>
                      <span className={`text-xs font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{temperature.toFixed(1)}</span>
                    </motion.div>
                    
                    <AnimatePresence>
                      {showTemperatureInfo && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ type: "spring", damping: 20 }}
                          ref={temperatureInfoRef}
                          className={`absolute mt-1 w-64 rounded-md shadow-lg z-20 p-3 border text-xs ${
                        isDarkMode 
                              ? 'bg-gray-800 border-gray-700 text-gray-300' 
                              : 'bg-white border-gray-200 text-gray-700'
                          }`}
                        >
                          <h4 className="font-semibold mb-1">About Temperature</h4>
                          <p className="mb-2">Temperature controls the randomness of the AI's responses:</p>
                          <ul className="mb-2 space-y-1">
                            <li><span className="font-bold">Low (0.1-0.3):</span> More predictable, factual, and conservative</li>
                            <li><span className="font-bold">Medium (0.4-0.7):</span> Balanced creativity and consistency</li>
                            <li><span className="font-bold">High (0.8-1.0):</span> More creative, varied, and sometimes unpredictable</li>
                          </ul>
                          <p>Adjust based on your needs - lower for professional/technical writing, higher for creative content.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <motion.input 
                      variants={fadeIn}
                      type="range" 
                      min="0.1" 
                      max="1.0" 
                      step="0.1" 
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className={`w-full accent-blue-500 ${isDarkMode ? 'bg-gray-700' : ''}`}
                    />
                    
                    <motion.div 
                      variants={fadeIn}
                      className="flex justify-between text-xs mt-1"
                    >
                      <span className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}>Precise</span>
                      <span className={isDarkMode ? 'text-green-400' : 'text-green-600'}>Balanced</span>
                      <span className={isDarkMode ? 'text-purple-400' : 'text-purple-600'}>Creative</span>
                    </motion.div>
                  </motion.div>
                  
                  {/* Custom Model Button */}
                  <motion.div 
                    variants={fadeIn}
                    className="mb-2 flex flex-col"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCustomModelForm(!showCustomModelForm)}
                      className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-200' 
                          : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <Plus size={16} className="mr-1" />
                      Add Custom Model
                    </motion.button>
                  </motion.div>
                </motion.div>
            )}

            {activeSidebarTab === 'history' && sidebarOpen && (
                <motion.div 
                  key="history-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-4"
                >
                  <h3 className={`font-medium text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Document History</h3>
                  
                  {history.length === 0 ? (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`text-xs italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                      No history yet. Start generating content!
                    </motion.p>
                  ) : (
                    <motion.ul 
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      {history.map((item) => (
                        <motion.li 
                          key={item.id}
                          variants={slideInFromLeft}
                          className={`text-xs p-2 rounded ${
                        isDarkMode 
                          ? 'bg-gray-700 hover:bg-gray-600' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{item.action}</span>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.timestamp}</span>
                        </div>
                          <div className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Version: {item.version}
                      </div>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
        </div>
        
          {/* Resizer for left sidebar */}
          <div
            ref={leftResizeRef}
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize ${isDarkMode ? 'bg-gray-600 hover:bg-blue-600' : 'bg-gray-200 hover:bg-blue-400'}`}
            onMouseDown={handleLeftResizerMouseDown}
          />
      </div>
      </motion.div>

      {/* Main Content */}
      <motion.div 
        className="flex-1 flex flex-col overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Top Bar */}
        <motion.div 
          className={`p-4 border-b flex justify-between items-center ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center">
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className={`font-medium bg-transparent border-none focus:outline-none focus:ring-1 px-2 py-1 rounded ${
                isDarkMode 
                  ? 'text-gray-100 focus:ring-blue-400' 
                  : 'focus:ring-blue-500'
              }`}
            />
            <span className={`mx-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>|</span>
            <div className={`flex items-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {documentTypes.find(t => t.id === documentType)?.icon}
              <span className="ml-1">{documentTypes.find(t => t.id === documentType)?.name}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : 'rgba(243, 244, 246, 0.7)' }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-md ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title="New Document"
              onClick={createNewDocument}
            >
              <FileText size={18} />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1, backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : 'rgba(243, 244, 246, 0.7)' }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-md ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title="Save"
              onClick={saveDocument}
            >
              <Save size={18} />
            </motion.button>
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.1, backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : 'rgba(243, 244, 246, 0.7)' }}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-md ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                title="Export"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <Download size={18} />
              </motion.button>
              
              <AnimatePresence>
              {showExportMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  ref={exportMenuRef}
                  className={`absolute right-0 mt-1 w-36 rounded-md shadow-lg z-10 py-1 border ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                    <motion.button 
                      variants={fadeIn}
                      whileHover={{ backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.5)' }}
                    onClick={() => {
                      handleExport('markdown');
                      setShowExportMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Markdown (.md)
                    </motion.button>
                    <motion.button 
                      variants={fadeIn}
                      whileHover={{ backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.5)' }}
                    onClick={() => {
                      handleExport('pdf');
                      setShowExportMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    PDF (.pdf)
                    </motion.button>
                    <motion.button 
                      variants={fadeIn}
                      whileHover={{ backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.5)' }}
                    onClick={() => {
                      handleExport('docx');
                      setShowExportMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Word (.docx)
                    </motion.button>
                  </motion.div>
              )}
              </AnimatePresence>
            </div>
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.1, backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.7)' : 'rgba(243, 244, 246, 0.7)' }}
                whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-md relative ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title="Settings"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            >
              <Settings size={18} />
              </motion.button>
              
              <AnimatePresence>
              {showSettingsMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  ref={settingsMenuRef}
                  className={`absolute right-0 mt-2 w-72 rounded-md shadow-lg overflow-hidden z-20 border ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}
                  style={{ top: '100%' }}
                >
                    <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <h3 className="text-sm font-medium">Settings</h3>
                    </div>
                    
                    <div className="p-4">
                      {/* Theme Toggle */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dark Mode</span>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={toggleDarkMode}
                          className={`p-1.5 rounded-full ${
                              isDarkMode 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-300 text-gray-800'
                          }`}
                        >
                          {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
                        </motion.button>
                    </div>
                    
                      {/* Token Usage */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Token Usage</span>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }} 
                            onClick={() => setShowUsageStats(!showUsageStats)}
                            className={`text-xs px-2 py-1 rounded ${
                              isDarkMode 
                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            {showUsageStats ? 'Hide' : 'Show'}
                          </motion.button>
                    </div>
                    
                        <AnimatePresence>
                          {showUsageStats && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              ref={usageStatsRef}
                              className={`text-xs p-2 rounded mb-2 ${
                              isDarkMode 
                                  ? 'bg-gray-700 text-gray-300' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              <div className="flex justify-between mb-1">
                                <span>Total usage</span>
                                <span>{tokenUsage.total.toLocaleString()} tokens</span>
                                </div>
                                <div className="flex justify-between">
                                <span>Last request</span>
                                <span>{tokenUsage.lastRequest.toLocaleString()} tokens</span>
                                </div>
                              {/* Estimated cost based on model */}
                              <div className="mt-2 pt-2 border-t border-gray-600">
                                <div className="flex justify-between">
                                  <span>Est. cost (current model)</span>
                                  <span>${estimateCost(tokenUsage.total, model).toFixed(4)}</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                    </div>
                    
                      {/* API Key Management */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>API Key</span>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }} 
                            onClick={() => setShowApiKeyModal(true)}
                            className={`text-xs px-2 py-1 rounded ${
                              isDarkMode 
                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            {apiKeySet ? 'Update' : 'Set Key'}
                          </motion.button>
                    </div>
                          
                        <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {apiKeySet 
                            ? <div className="flex items-center">
                                <Shield size={12} className={`mr-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                                <span>API key is set</span>
                                  </div>
                            : <div className="flex items-center">
                                <AlertTriangle size={12} className={`mr-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                                <span>No API key configured</span>
                                  </div>
                          }
                                </div>
                              </div>
                          </div>
                  </motion.div>
                      )}
              </AnimatePresence>
                    </div>
            
            {/* Dark mode toggle in top bar for quick access */}
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              transition={{ rotate: { duration: 0.5 } }}
              className={`p-2 rounded-md ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              onClick={toggleDarkMode}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </motion.button>
                  </div>
        </motion.div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Editor Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs for Editor/Chat */}
            <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button 
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 font-medium text-sm flex items-center ${
                  activeTab === 'editor' 
                    ? `border-b-2 border-blue-500 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}` 
                    : `${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                <Edit3 size={16} className="mr-1" />
                Editor
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 font-medium text-sm flex items-center ${
                  activeTab === 'chat' 
                    ? `border-b-2 border-blue-500 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}` 
                    : `${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                <MessageCircle size={16} className="mr-1" />
                Chat
              </button>
            </div>
            
            {/* Editor */}
            {activeTab === 'editor' && (
              <>
                <div className={`flex-1 p-6 overflow-y-auto ${isDarkMode ? 'bg-gray-900' : ''}`}>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing or type '/' for commands..."
                    className={`w-full h-full p-4 border-none focus:outline-none focus:ring-0 bg-transparent resize-none ${
                      isDarkMode ? 'text-gray-100' : ''
                    }`}
                  />
                </div>
                
                {/* Editor Controls */}
                <div className={`p-3 border-t flex justify-between items-center ${
                  isDarkMode 
                    ? 'border-gray-700 bg-gray-800 text-gray-300' 
                    : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {content.split(/\s+/).filter(Boolean).length} words
                  </div>
                  <div className="flex space-x-2">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={saveDocument}
                      disabled={!content.trim()}
                      className={`px-3 py-1 rounded-md text-sm flex items-center ${
                        !content.trim()
                          ? `${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}` 
                          : `${isDarkMode ? 'bg-blue-700 text-white hover:bg-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`
                      }`}
                    >
                      <Save className="mr-1" size={14} />
                      Save
                    </motion.button>
                  </div>
                </div>
              </>
            )}
            
            {/* Chat Interface */}
            {activeTab === 'chat' && (
              <>
                <div className={`flex-1 p-4 overflow-y-auto ${
                  isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
                }`}>
                  <div className="max-w-3xl mx-auto">
                    {/* Clear chat button - only visible when there are messages */}
                    {chatMessages.length > 0 && (
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={clearChat}
                          className={`flex items-center text-xs py-1 px-2 rounded ${
                            isDarkMode 
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <Trash2 size={14} className="mr-1" />
                          Clear Chat
                        </button>
                      </div>
                    )}
                    
                    {/* Welcome message if no chat messages */}
                    {chatMessages.length === 0 && (
                      <div className={`text-center mt-10 mb-6 ${isDarkMode ? 'text-gray-300' : ''}`}>
                        <Bot size={48} className="mx-auto mb-3 text-blue-500" />
                        <h3 className="text-xl font-medium mb-2">Chat with your AI assistant</h3>
                        <p className={`mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Ask anything about writing, brainstorming, or get help with your document
                        </p>
                        <p className={`text-sm mb-6 ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          Responses will be tailored to your selected <b>{documentTypes.find(t => t.id === documentType)?.name}</b> document type with a <b>{tone}</b> tone
                        </p>
                        
                        {/* Conversation starters */}
                        <div className="conversation-starters">
                          <h4>Try starting with:</h4>
                          <div className="starter-buttons">
                            {conversationStarters.map((starter, index) => (
                              <button 
                                key={index} 
                                className={`starter-button ${
                                  isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : ''
                                }`}
                                onClick={() => selectConversationStarter(starter)}
                              >
                                {starter}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Chat messages */}
                    <motion.div 
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="space-y-4"
                    >
                      {chatMessages.map((msg, index) => (
                        <motion.div 
                          key={index} 
                          variants={msg.role === 'user' ? slideInFromRight : slideInFromLeft}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <motion.div 
                            className={`relative p-3 rounded-lg ${
                              msg.role === 'user' 
                                ? 'bg-blue-500 text-white max-w-[80%]' 
                                : `${isDarkMode 
                                    ? 'bg-gray-800 border-gray-700 text-gray-100 max-w-[80%]' 
                                : 'bg-white border border-gray-200 text-gray-800 max-w-[80%]'
                                  }`
                            }`}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            {/* User avatar or AI indicator */}
                            {msg.role === 'assistant' && !msg.isTyping && (
                              <motion.div 
                                className="absolute -left-2 -top-2 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                              >
                                <Bot size={12} className="text-blue-600" />
                              </motion.div>
                            )}
                            
                            {/* Message content */}
                            {msg.isTyping ? (
                              <div className="flex space-x-1 items-center h-6 py-3">
                                <motion.div 
                                  className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" 
                                  style={{ animationDelay: '0ms' }}
                                ></motion.div>
                                <motion.div 
                                  className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" 
                                  style={{ animationDelay: '150ms' }}
                                ></motion.div>
                                <motion.div 
                                  className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" 
                                  style={{ animationDelay: '300ms' }}
                                ></motion.div>
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap">{msg.content}</div>
                            )}
                          </motion.div>
                        </motion.div>
                      ))}
                      
                      {/* Typing animation */}
                      {isTyping && (
                        <motion.div 
                          className="flex justify-start"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring" }}
                        >
                          <motion.div 
                            className={`relative p-3 rounded-lg max-w-[80%] ${
                            isDarkMode 
                              ? 'bg-gray-800 border-gray-700 text-gray-100' 
                              : 'bg-white border border-gray-200 text-gray-800'
                            }`}
                            animate={{ 
                              boxShadow: [
                                "0 0 0 rgba(59, 130, 246, 0)",
                                "0 0 10px rgba(59, 130, 246, 0.5)",
                                "0 0 0 rgba(59, 130, 246, 0)"
                              ]
                            }}
                            transition={{ 
                              duration: 2,
                              repeat: Infinity
                            }}
                          >
                            <motion.div 
                              className="absolute -left-2 -top-2 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center"
                              initial={{ scale: 0 }}
                              animate={{ 
                                scale: [1, 1.2, 1],
                                rotate: [0, 10, -10, 0]
                              }}
                              transition={{ 
                                scale: { duration: 2, repeat: Infinity },
                                rotate: { duration: 1.5, repeat: Infinity }
                              }}
                            >
                              <Bot size={12} className="text-blue-600" />
                            </motion.div>
                            <div className="flex items-center space-x-2 h-6 py-3">
                              <motion.div
                                className={`h-3 w-3 rounded-full ${isDarkMode ? 'bg-blue-500' : 'bg-blue-400'}`}
                                animate={{
                                  scale: [1, 1.5, 1],
                                  opacity: [0.5, 1, 0.5]
                                }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: 0
                                }}
                              />
                              <motion.div
                                className={`h-3 w-3 rounded-full ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-400'}`}
                                animate={{
                                  scale: [1, 1.5, 1],
                                  opacity: [0.5, 1, 0.5]
                                }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: 0.2
                                }}
                              />
                              <motion.div
                                className={`h-3 w-3 rounded-full ${isDarkMode ? 'bg-purple-500' : 'bg-purple-400'}`}
                                animate={{
                                  scale: [1, 1.5, 1],
                                  opacity: [0.5, 1, 0.5]
                                }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: 0.4
                                }}
                              />
                            </div>
                            <div className="whitespace-pre-wrap mt-2">{typingText}</div>
                          </motion.div>
                        </motion.div>
                      )}
                      
                      {/* For auto-scrolling to bottom */}
                      <div ref={chatEndRef} />
                    </motion.div>
                  </div>
                </div>
                
                <div className={`p-3 border-t ${
                  isDarkMode 
                    ? 'border-gray-700 bg-gray-800' 
                    : 'border-gray-200 bg-white'
                }`}>
                  <div className="max-w-3xl mx-auto">
                    <div className="flex">
                      <motion.input
                        whileFocus={{ scale: 1.01 }}
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isGenerating && messageInput.trim() && generateAIResponse()}
                        placeholder="Type a message..."
                        className={`flex-1 p-3 rounded-l-lg focus:outline-none focus:ring-1 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-400 placeholder-gray-400' 
                            : 'border border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={generateAIResponse}
                        disabled={isGenerating || !messageInput.trim()}
                        className={`p-3 rounded-r-lg transition-colors ${
                          isGenerating || !messageInput.trim()
                            ? `${isDarkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500'}` 
                            : `${isDarkMode ? 'bg-blue-700 text-white hover:bg-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`
                        }`}
                      >
                        {isGenerating ? 
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader size={20} /> 
                          </motion.div>
                          : <Send size={20} />
                        }
                      </motion.button>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Using: <span className="font-semibold">{getModelDisplayName(model)}</span>
                        <span className="ml-2">({documentTypes.find(t => t.id === documentType)?.name}, {tone})</span>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setShowUsageStats(!showUsageStats)}
                          className={`ml-2 underline ${
                            isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-700'
                          }`}
                        >
                          Usage Stats
                        </motion.button>
                        
                        <AnimatePresence>
                        {showUsageStats && (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            ref={usageStatsRef}
                            className={`absolute bottom-16 left-4 w-64 rounded-md shadow-lg z-10 p-3 border ${
                              isDarkMode 
                                ? 'bg-gray-800 border-gray-700 text-gray-200' 
                                : 'bg-white border-gray-200 text-gray-800'
                            }`}
                          >
                            <h4 className="font-medium mb-2">Token Usage</h4>
                            <div className="mb-1">
                              <div className="flex justify-between">
                                <span>Total tokens used:</span>
                                <span className="font-medium">{tokenUsage.total.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Last request:</span>
                                <span>{tokenUsage.lastRequest.toLocaleString()} tokens</span>
                              </div>
                              {!modelOptions.find(m => m.id === model)?.free && (
                                <div className="flex justify-between">
                                  <span>Estimated cost:</span>
                                  <span>${estimateCost(tokenUsage.total, model).toFixed(4)}</span>
                                </div>
                              )}
                            </div>
                            <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Note: Token counts are estimates. Actual usage may vary.
                            </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Type / for commands
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Suggestions Panel with dynamic width - Only show in editor mode */}
          {activeTab === 'editor' && (
            <motion.div 
              className={`border-l flex flex-col flex-shrink-0 relative resizable-panel ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`} 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              style={{ width: `${rightPanelWidth}px` }}
            >
              <div className={`p-3 border-b font-medium text-sm ${
                isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200'
              }`}>
                AI Suggestions
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {suggestions.length === 0 && !isGenerating ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className={`text-center text-sm py-10 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {!apiKeySet ? (
                      <>
                        {renderApiKeyPrompt()}
                        <p className="mt-4">
                          Once your API key is set, you can generate AI-powered suggestions.
                        </p>
                      </>
                    ) : (
                      <>
                        <motion.div
                          whileHover={{ rotate: 180 }}
                          transition={{ duration: 0.5 }}
                        >
                          <RefreshCw className="mx-auto mb-2" size={20} />
                        </motion.div>
                        Click "Generate Suggestions" to get AI feedback on your writing
                      </>
                    )}
                  </motion.div>
                ) : isGenerating ? (
                  <motion.div 
                    className={`text-center text-sm py-10 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: 360
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                      className="mx-auto mb-4 relative"
                      style={{ width: '60px', height: '60px' }}
                    >
                      <motion.div
                        className={`absolute inset-0 rounded-full ${isDarkMode ? 'bg-blue-700/30' : 'bg-blue-100'}`}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader size={30} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <p className="font-medium mb-2">Analyzing your text...</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Our AI is carefully examining your content to provide helpful suggestions
                      </p>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {suggestions.map(suggestion => (
                      <motion.div 
                      key={suggestion.id} 
                        variants={fadeIn}
                        className={`p-3 rounded-lg ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 border' 
                            : 'bg-white border border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className={`text-xs font-medium px-2 py-1 rounded ${
                            suggestion.type === 'grammar' 
                              ? isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                              : suggestion.type === 'improvement'
                              ? isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                              : isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                          }`}>
                            {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                          </div>
                        <div className="flex space-x-1">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => applySuggestion(suggestion.id)}
                              className={`p-1 rounded ${
                                isDarkMode 
                                  ? 'text-gray-300 hover:bg-gray-600' 
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                              title="Apply suggestion"
                            >
                              <Check size={16} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            onClick={() => setSuggestions(suggestions.filter(s => s.id !== suggestion.id))}
                            className={`p-1 rounded ${
                                isDarkMode 
                                  ? 'text-gray-300 hover:bg-gray-600' 
                                  : 'text-gray-700 hover:bg-gray-100'
                            }`}
                              title="Dismiss suggestion"
                          >
                              <Trash2 size={16} />
                            </motion.button>
                        </div>
                      </div>
                      <div className={`mt-2 ${isDarkMode ? 'text-gray-300' : ''}`}>{suggestion.text}</div>
                      
                      {/* Suggestion feedback UI */}
                      {!suggestion.rated && (
                        <div className={`mt-3 pt-2 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} flex justify-between items-center text-xs`}>
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Was this helpful?</span>
                          <div className="flex space-x-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleSuggestionFeedback(suggestion.id, true)}
                              className={`p-1 px-2 rounded ${
                                isDarkMode 
                                  ? 'bg-green-900/30 text-green-300 hover:bg-green-800/50' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              <ThumbsUp size={12} className="inline mr-1" />
                              Yes
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleSuggestionFeedback(suggestion.id, false)}
                              className={`p-1 px-2 rounded ${
                                isDarkMode 
                                  ? 'bg-red-900/30 text-red-300 hover:bg-red-800/50' 
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              <ThumbsDown size={12} className="inline mr-1" />
                              No
                            </motion.button>
                          </div>
                        </div>
                      )}
                      
                      {/* Feedback thank you message */}
                      {suggestion.rated && (
                        <div className={`mt-3 pt-2 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Thank you for your feedback!
                        </div>
                      )}
                    </motion.div>
                  ))}
                  </motion.div>
                )}
                    </div>
              
              <div className="p-3 border-t flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={generateSuggestions}
                  disabled={isGenerating || !content.trim()}
                  className={`flex-1 py-2 px-3 rounded-md text-sm flex items-center justify-center ${
                    isGenerating || !content.trim()
                      ? isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isGenerating ? (
                    <motion.div
                      animate={{ 
                        rotate: 360,
                        scale: [1, 1.1, 1] 
                      }}
                      transition={{ 
                        rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                        scale: { duration: 0.5, repeat: Infinity }
                      }}
                      className="mr-2 text-white"
                    >
                      <RefreshCw size={16} />
                    </motion.div>
                  ) : (
                    <RefreshCw size={14} className="mr-1" />
                  )}
                  {isGenerating ? 'Processing...' : 'Generate Suggestions'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={improveWriting}
                  disabled={isGenerating || !content.trim()}
                  className={`flex-1 py-2 px-3 rounded-md text-sm flex items-center justify-center ${
                    isGenerating || !content.trim()
                      ? isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  }`}
                >
                  {isGenerating ? (
                    <motion.div
                      animate={{ 
                        rotate: 360,
                        scale: [1, 1.1, 1] 
                      }}
                      transition={{ 
                        rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                        scale: { duration: 0.5, repeat: Infinity }
                      }}
                      className="mr-2 text-white"
                    >
                      <PenTool size={16} />
                    </motion.div>
                  ) : (
                    <PenTool size={14} className="mr-1" />
                  )}
                  {isGenerating ? 'Processing...' : 'Improve Writing'}
                </motion.button>
              </div>
              
              {/* Right panel resizer */}
              <div
                ref={rightResizeRef}
                className={`absolute top-0 left-0 w-1 h-full cursor-col-resize ${isDarkMode ? 'bg-gray-600 hover:bg-blue-600' : 'bg-gray-200 hover:bg-blue-400'}`}
                onMouseDown={handleRightResizerMouseDown}
              />
            </motion.div>
          )}

      {/* Custom Model Form Modal */}
      {showCustomModelForm && (
        <div 
          ref={customModelFormRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <div className={`rounded-lg shadow-xl p-6 w-96 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : ''}`}>Add Custom Model</h3>
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : ''}`}>Model ID</label>
              <input
                type="text"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder="e.g., anthropic/claude-3-haiku-20240307"
                className={`w-full p-2 text-sm rounded-md ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' 
                    : 'border border-gray-300'
                }`}
              />
            </div>
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : ''}`}>Display Name</label>
              <input
                type="text"
                value={customModelName}
                onChange={(e) => setCustomModelName(e.target.value)}
                placeholder="e.g., Claude 3 Haiku"
                className={`w-full p-2 text-sm rounded-md ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' 
                    : 'border border-gray-300'
                }`}
              />
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setShowCustomModelForm(false)}
                className={`px-4 py-2 rounded-md ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={addCustomModel}
                disabled={isVerifyingModel || !customModelId.trim() || !customModelName.trim()}
                className={`px-4 py-2 rounded-md text-white ${
                  isVerifyingModel || !customModelId.trim() || !customModelName.trim()
                    ? 'bg-gray-400' 
                    : isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-500' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isVerifyingModel ? (
                  <>
                    <Loader size={16} className="inline mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Add & Verify Model'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </motion.div>

      {/* API Key Management Modal */}
      {showApiKeyModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <div 
            ref={apiKeyModalRef}
            className={`rounded-lg shadow-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : ''}`}>
              {apiKeySet ? 'Update OpenRouter API Key' : 'Add OpenRouter API Key'}
            </h3>
            
            {apiKeySet && (
              <div className={`mb-4 p-3 rounded-md ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className="flex items-center mb-2">
                  <Key size={16} className={`mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  <span className={`font-medium text-sm ${isDarkMode ? 'text-gray-300' : ''}`}>Current API Key:</span>
                </div>
                <div className={`font-mono text-sm p-2 rounded border flex justify-between items-center ${
                  isDarkMode 
                    ? 'bg-gray-600 border-gray-600 text-gray-300' 
                    : 'bg-gray-100 border-gray-200'
                }`}>
                  {maskedApiKey || '•••••••••••••••'}
                  <button
                    onClick={() => {
                      // Just copy the masked version since we don't have access to the full key
                      copyToClipboard(maskedApiKey);
                      showNotification('Masked API key copied to clipboard', 'info');
                    }}
                    className={`ml-2 ${
                      isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Copy masked API key to clipboard"
                  >
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Your API key is securely masked showing only the first 3 and last 5 characters.
                </p>
              </div>
            )}
            
            <div className="mb-5">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : ''}`}>
                {apiKeySet ? 'New API Key' : 'API Key'}
                <span className="ml-1 text-red-500">*</span>
                <a 
                  href="https://openrouter.ai/keys" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`ml-2 text-xs underline ${
                    isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                  }`}
                >
                  Get a key
                </a>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    // Clear error when user starts typing again
                    if (apiKeyError) setApiKeyError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && apiKeyInput.trim() && !isUpdatingApiKey) {
                      updateApiKey();
                    } else if (e.key === 'Escape') {
                      setShowApiKeyModal(false);
                      setApiKeyInput('');
                      setApiKeyError('');
                    }
                  }}
                  placeholder="sk-or-..."
                  className={`w-full p-3 rounded-md font-mono text-sm pr-10 ${
                    isDarkMode ? 'bg-gray-700 text-gray-200 placeholder-gray-400 border-gray-600' : ''
                  }
                    ${apiKeyInput && !apiKeyInput.startsWith('sk-or-') 
                      ? isDarkMode ? 'border-red-700 bg-red-900/30' : 'border-red-300 bg-red-50' 
                      : apiKeyInput.startsWith('sk-or-') 
                        ? isDarkMode ? 'border-green-700 bg-green-900/30' : 'border-green-300 bg-green-50' 
                        : isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
                  autoComplete="off"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex">
                  {apiKeyInput && (
                    <span className="mr-2">
                      {apiKeyInput.startsWith('sk-or-') 
                        ? <Check className="text-green-500" size={18} />
                        : apiKeyInput.length > 0 && <AlertCircle className="text-red-500" size={18} />}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className={isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              {apiKeyError && (
                <p className="text-xs text-red-500 mt-1">{apiKeyError}</p>
              )}
              
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={testApiKey}
                  disabled={isTestingApiKey || !apiKeyInput.trim() || !apiKeyInput.startsWith('sk-or-')}
                  className={`px-3 py-1.5 text-sm rounded flex items-center justify-center
                    ${isTestingApiKey || !apiKeyInput.trim() || !apiKeyInput.startsWith('sk-or-')
                      ? isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                      : apiKeyTestSuccess
                        ? isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'
                        : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    } cursor-${isTestingApiKey || !apiKeyInput.trim() || !apiKeyInput.startsWith('sk-or-') ? 'not-allowed' : 'pointer'}`}
                >
                  {isTestingApiKey ? (
                    <Loader className="mr-1 animate-spin" size={14} />
                  ) : apiKeyTestSuccess ? (
                    <Check className="mr-1" size={14} />
                  ) : (
                    <Shield className="mr-1" size={14} />
                  )}
                  {apiKeyTestSuccess ? 'Verified' : 'Test Connection'}
                </button>
              </div>
              
              <p className={`text-xs mt-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Enter your OpenRouter API key. Get one at{' '}
                <a 
                  href="https://openrouter.ai/keys" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`hover:underline ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`}
                >
                  openrouter.ai/keys
                </a>
              </p>
            </div>
            
            {/* More information about API keys */}
            <div className={`mb-5 p-3 rounded flex items-start ${
              isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-800'
            }`}>
              <Info size={14} className={`mt-0.5 mr-2 flex-shrink-0 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-500'
              }`} />
              <div>
                <strong>Why do I need an API key?</strong>
                <p className="mt-1">
                  The API key connects this app to OpenRouter's AI models. Your key allows access to models 
                  like Llama, Gemini, and DeepSeek to power all writing features.
                </p>
                <p className="mt-1">
                  OpenRouter offers free credits for many models, making it easy to get started.
                </p>
              </div>
            </div>
            
            {/* Remember key option */}
            <div className="mb-5 flex items-center">
              <input
                type="checkbox"
                id="rememberKey"
                checked={rememberKey}
                onChange={(e) => setRememberKey(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="rememberKey" className={`text-sm ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Remember this key in browser storage
              </label>
              <button
                className={`ml-1 ${
                  isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                }`}
                onClick={() => setShowSecurityInfo(!showSecurityInfo)}
              >
                <Info size={14} />
              </button>
              
              {showSecurityInfo && (
                <div 
                  ref={securityInfoRef}
                  className={`absolute mt-1 ml-5 w-64 rounded-md shadow-lg z-30 p-3 border text-xs ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 text-gray-300' 
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  <h4 className="font-semibold mb-1">About API Key Storage</h4>
                  <p className="mb-2">
                    If checked, your API key will be stored securely in your browser's local storage.
                    This means you won't need to re-enter it each time you use the application.
                  </p>
                  <p>
                    If unchecked, your key will only be stored for the current session and you'll
                    need to enter it again when you reload the page.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setApiKeyInput('');
                  setApiKeyError('');
                  setApiKeyTestSuccess(false);
                }}
                className={`px-4 py-2 rounded-md ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={updateApiKey}
                disabled={isUpdatingApiKey || !apiKeyInput.trim() || !apiKeyInput.startsWith('sk-or-')}
                className={`px-4 py-2 rounded-md text-white ${
                  isUpdatingApiKey || !apiKeyInput.trim() || !apiKeyInput.startsWith('sk-or-')
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-500' 
                      : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isUpdatingApiKey ? (
                  <>
                    <Loader size={16} className="inline mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save API Key'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed bottom-5 right-5 p-4 rounded-md shadow-lg z-50 
          ${toastType === 'success' ? 'bg-green-100 border-l-4 border-green-500' :
            toastType === 'error' ? 'bg-red-100 border-l-4 border-red-500' : 
            'bg-blue-100 border-l-4 border-blue-500'}`}>
          <div className="flex items-center">
            {toastType === 'success' && <Check className="text-green-500 mr-2" size={20} />}
            {toastType === 'error' && <AlertCircle className="text-red-500 mr-2" size={20} />}
            {toastType === 'info' && <Info className="text-blue-500 mr-2" size={20} />}
            <p className={`text-sm ${
              toastType === 'success' ? 'text-green-700' : 
              toastType === 'error' ? 'text-red-700' : 'text-blue-700'
            }`}>{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
} 