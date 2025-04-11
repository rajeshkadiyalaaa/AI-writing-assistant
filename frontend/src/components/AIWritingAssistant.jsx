import React, { useState, useEffect, useRef } from 'react';
import { 
  PenTool, Save, Download, History, Settings, 
  Trash2, Check, RefreshCw, Send, FileText, 
  BookOpen, Mail, Edit3, ChevronDown, Loader,
  MessageCircle, Bot, Info, Plus
} from 'lucide-react';
import axios from 'axios';

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

  // LLM Models with display names and strengths
  const modelOptions = [
    { 
      id: 'nvidia/llama-3.1-nemotron-nano-8b-v1:free', 
      name: 'nvidia-llama-3.1',
      strengths: ['general', 'creative'],
      description: 'Balanced model good for general-purpose writing and creative tasks',
      free: true
    },
    { 
      id: 'openrouter/quasar-alpha', 
      name: 'Quasar Alpha',
      strengths: ['business', 'academic'],
      description: 'Excellent for professional writing, business documents, and academic content',
      free: false
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
    // Only show recommendation alert if not already using a recommended model
    if (!isRecommendedModel(model)) {
      const confirmed = window.confirm(
        `Based on your "${documentTypes.find(t => t.id === documentType)?.name}" document type, "${recommendedModel.name}" is recommended.\n\nWould you like to switch to this model?`
      );
      if (confirmed) {
        setModel(recommendedModel.id);
        // Clear chat messages when model changes
        setChatMessages([]);
      }
    }
  }, [documentType, documentTypes, getRecommendedModel, isRecommendedModel, model]);

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
    if (!suggestionData) return [];
    
    // If it's already an array, return it
    if (Array.isArray(suggestionData)) return suggestionData;
    
    // If it's a categorized object (from the Python script), convert to array
    if (typeof suggestionData === 'object') {
      const result = [];
      let idCounter = 1;
      
      // Process each category
      Object.entries(suggestionData).forEach(([category, items]) => {
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
      
      return result;
    }
    
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
      // Call backend API for suggestions
      const response = await axios.post('/api/suggestions', {
        content: content,
        documentType: documentType,
        tone: tone,
        model: model
      });
      
      // Handle the response, normalizing the suggestions data
      const normalizedSuggestions = normalizeSuggestions(response.data.suggestions);
      console.log('Normalized suggestions:', normalizedSuggestions);
      setSuggestions(normalizedSuggestions);
      
      // Add to history
      const now = new Date();
      setHistory([...history, {
        id: history.length + 1,
        timestamp: now.toLocaleTimeString(),
        action: `Generated suggestions with ${getModelDisplayName(model)}`,
        version: history.length + 1
      }]);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fallback with demo suggestions
      setSuggestions([
        { id: 1, type: 'improvement', text: 'Consider using more concise language in the introduction.' },
        { id: 2, type: 'alternative', text: 'Alternative phrasing: "The implementation of this system would significantly enhance productivity."' },
        { id: 3, type: 'grammar', text: 'Grammar issue: Change "their" to "there" in paragraph 2.' }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to improve writing
  const improveWriting = async () => {
    if (!content.trim()) return;
    
    setIsGenerating(true);
    
    try {
      // Call backend API to improve the writing
      const response = await axios.post('/api/improve', {
        content: content,
        targetAudience: documentType,
        readingLevel: tone === 'academic' ? 'advanced' : tone === 'technical' ? 'advanced' : 'intermediate',
        additionalInstructions: `Use a ${tone} tone.`,
        model: model
      });
      
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
      }
    } catch (error) {
      console.error('Error improving writing:', error);
      
      // Add improvement error as a suggestion
      setSuggestions([
        ...suggestions,
        {
          id: Date.now(),
          type: 'grammar',
          text: 'Unable to improve writing. Please try again or check your content.'
        }
      ]);
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
      alert('Both Model ID and Display Name are required');
      return;
    }
    
    setIsVerifyingModel(true);
    
    try {
      // Verify the model by sending a test request
      const response = await axios.post('/api/verify-model', {
        model: customModelId
      });
      
      if (response.data.success) {
        // Add the model to options
        const newModel = {
          id: customModelId,
          name: customModelName,
          strengths: ['general'], // Default strength
          description: 'Custom model added by user',
          free: false, // Assume custom models are not free
          custom: true
        };
        
        // Add the new model to the model options array
        modelOptions.push(newModel);
        
        // Switch to the new model
        setModel(customModelId);
        
        // Clear chat messages when model changes
        setChatMessages([]);
        
        // Hide the form
        setShowCustomModelForm(false);
        
        // Reset form
        setCustomModelId('');
        setCustomModelName('');
        
        // Success message
        alert(`Successfully added and verified model: ${customModelName}`);
      } else {
        throw new Error(response.data.error || 'Failed to verify model');
      }
    } catch (error) {
      console.error('Error verifying model:', error);
      alert(`Failed to verify model: ${error.message || 'Unknown error'}`);
    } finally {
      setIsVerifyingModel(false);
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

  return (
    <div className={`flex h-screen bg-gray-100 text-gray-900 ${(isDraggingLeft || isDraggingRight) ? 'no-select' : ''}`}>
      {/* Sidebar with dynamic width */}
      <div 
        className="bg-white border-r border-gray-200 transition-all relative flex-shrink-0 resizable-panel"
        style={{ width: sidebarOpen ? `${leftPanelWidth}px` : '64px' }}
      >
        <div className="flex flex-col h-full">
          {/* App Logo & Title */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <PenTool className="text-blue-600" />
              {sidebarOpen && <span className="ml-2 font-bold">AI Writer</span>}
            </div>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronDown className={`transform ${sidebarOpen ? 'rotate-180' : ''}`} size={16} />
            </button>
          </div>

          {/* Sidebar Tabs */}
          <div className="flex border-b border-gray-200">
            <button 
              className={`flex-1 p-3 text-xs ${activeSidebarTab === 'format' ? 'bg-gray-100' : ''}`}
              onClick={() => setActiveSidebarTab('format')}
            >
              {sidebarOpen ? 'Format & Style' : <Settings size={16} className="mx-auto" />}
            </button>
            <button 
              className={`flex-1 p-3 text-xs ${activeSidebarTab === 'history' ? 'bg-gray-100' : ''}`}
              onClick={() => setActiveSidebarTab('history')}
            >
              {sidebarOpen ? 'History' : <History size={16} className="mx-auto" />}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeSidebarTab === 'format' && sidebarOpen && (
              <div className="p-4">
                {/* Document Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Document Type</label>
                  <select 
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    {documentTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tone */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Tone</label>
                  <select 
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    {toneOptions.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {/* Model Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    AI Model
                    <button
                      onClick={() => setShowModelInfo(!showModelInfo)}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                      aria-label="Model information"
                    >
                      <Info size={14} />
                    </button>
                    
                    {showModelInfo && (
                      <div 
                        ref={modelInfoRef}
                        className="absolute mt-1 w-64 bg-white rounded-md shadow-lg z-20 p-3 border border-gray-200 text-xs text-gray-700"
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
                      </div>
                    )}
                  </label>
                  <div className="flex mb-2">
                    <select 
                      value={model}
                      onChange={(e) => {
                        setModel(e.target.value);
                        // Clear chat messages when model changes
                        setChatMessages([]);
                      }}
                      className="flex-1 p-2 border border-gray-300 rounded-l-md text-sm"
                    >
                      {modelOptions.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.strengths.includes(documentType) ? "✓" : ""}
                          {m.free ? " (free)" : ""}
                          {m.custom ? " (custom)" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowCustomModelForm(!showCustomModelForm)}
                      className="p-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600"
                      title="Add custom model"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  
                  {showCustomModelForm && (
                    <div 
                      ref={customModelFormRef}
                      className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50"
                    >
                      <h4 className="text-sm font-medium mb-2">Add Custom Model</h4>
                      <div className="mb-2">
                        <label className="block text-xs mb-1">Model ID</label>
                        <input
                          type="text"
                          value={customModelId}
                          onChange={(e) => setCustomModelId(e.target.value)}
                          placeholder="e.g., anthropic/claude-3-haiku-20240307"
                          className="w-full p-2 text-xs border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs mb-1">Display Name</label>
                        <input
                          type="text"
                          value={customModelName}
                          onChange={(e) => setCustomModelName(e.target.value)}
                          placeholder="e.g., Claude 3 Haiku"
                          className="w-full p-2 text-xs border border-gray-300 rounded-md"
                        />
                      </div>
                      <button
                        onClick={addCustomModel}
                        disabled={isVerifyingModel || !customModelId.trim() || !customModelName.trim()}
                        className={`w-full p-2 rounded-md text-xs text-white ${
                          isVerifyingModel || !customModelId.trim() || !customModelName.trim()
                            ? 'bg-gray-400' 
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {isVerifyingModel ? (
                          <>
                            <Loader size={12} className="inline mr-1 animate-spin" />
                            Verifying Model...
                          </>
                        ) : (
                          'Add & Verify Model'
                        )}
                      </button>
                    </div>
                  )}
                  
                  <div className="mt-1 text-xs text-gray-500">
                    Currently using: <span className="font-semibold">{getModelDisplayName(model)}</span>
                    {isRecommendedModel(model) && (
                      <span className="ml-1 text-green-600">(Recommended for {documentTypes.find(t => t.id === documentType)?.name})</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {modelOptions.find(m => m.id === model)?.description}
                  </div>
                </div>

                {/* Temperature Control */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Temperature: <span className="font-semibold">{temperature.toFixed(1)}</span>
                    <button
                      onClick={() => setShowTemperatureInfo(!showTemperatureInfo)}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                      aria-label="Temperature information"
                    >
                      <Info size={14} />
                    </button>
                    
                    {showTemperatureInfo && (
                      <div 
                        ref={temperatureInfoRef}
                        className="absolute mt-1 w-64 bg-white rounded-md shadow-lg z-20 p-3 border border-gray-200 text-xs text-gray-700"
                      >
                        <h4 className="font-semibold mb-1">Understanding Temperature</h4>
                        <p className="mb-2">Temperature controls the randomness of the AI's responses:</p>
                        <div className="space-y-2 mb-2">
                          <div>
                            <div className="flex justify-between">
                              <span className="font-medium">Low (0.1-0.4)</span>
                              <span className="text-blue-600">More precise</span>
                            </div>
                            <p>Consistent, predictable, deterministic responses. Best for factual information.</p>
                          </div>
                          <div>
                            <div className="flex justify-between">
                              <span className="font-medium">Medium (0.5-0.7)</span>
                              <span className="text-purple-600">Balanced</span>
                            </div>
                            <p>Good balance between creativity and focus. Works well for most tasks.</p>
                          </div>
                          <div>
                            <div className="flex justify-between">
                              <span className="font-medium">High (0.8-1.0)</span>
                              <span className="text-pink-600">More creative</span>
                            </div>
                            <p>More varied, diverse, and sometimes unexpected outputs. Ideal for brainstorming.</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <span className="ml-2 text-xs text-gray-500">
                      {temperature < 0.4 ? '(More precise)' : 
                       temperature > 0.8 ? '(More creative)' : 
                       '(Balanced)'}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>

                {/* Export Options */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Export As</label>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleExport('markdown')}
                      className="flex-1 p-2 bg-gray-200 rounded-md text-xs hover:bg-gray-300"
                    >
                      Markdown
                    </button>
                    <button 
                      onClick={() => handleExport('pdf')}
                      className="flex-1 p-2 bg-gray-200 rounded-md text-xs hover:bg-gray-300"
                    >
                      PDF
                    </button>
                    <button 
                      onClick={() => handleExport('docx')}
                      className="flex-1 p-2 bg-gray-200 rounded-md text-xs hover:bg-gray-300"
                    >
                      DOCX
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSidebarTab === 'history' && sidebarOpen && (
              <div className="p-4">
                <h3 className="font-medium text-sm mb-2">Document History</h3>
                <div className="space-y-2">
                  {history.map(item => (
                    <div key={item.id} className="p-2 bg-gray-50 rounded-md text-xs">
                      <div className="flex justify-between">
                        <span>{item.action}</span>
                        <span className="text-gray-500">v{item.version}</span>
                      </div>
                      <div className="text-gray-500 mt-1">{item.timestamp}</div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-gray-500 text-xs p-2">No history yet</div>
                  )}
                </div>
              </div>
            )}

            {/* Saved Documents (Always visible if sidebar expanded) */}
            {sidebarOpen && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-sm">Saved Documents</h3>
                  <button
                    onClick={createNewDocument}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Create New Document"
                  >
                    + New
                  </button>
                </div>
                <div className="space-y-2">
                  {savedDocuments.map(doc => (
                    <div 
                      key={doc.id} 
                      className="p-2 bg-gray-50 rounded-md text-xs hover:bg-gray-100 cursor-pointer"
                      onClick={() => loadDocument(doc.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div 
                          className="font-medium truncate flex-1"
                        >
                          {doc.title}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDocument(doc.id);
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-200"
                          title="Delete document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="text-gray-500 mt-1 flex justify-between">
                        <span>{doc.date}</span>
                        {documentTypes.find(t => t.id === doc.type)?.icon}
                      </div>
                    </div>
                  ))}
                  {savedDocuments.length === 0 && (
                    <div className="text-gray-500 text-xs p-2">No saved documents yet</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Left panel resizer */}
        {sidebarOpen && (
          <div
            ref={leftResizeRef}
            className={`resize-handle right-0 ${isDraggingLeft ? 'active' : ''}`}
            onMouseDown={handleLeftResizerMouseDown}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="font-medium bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 px-2 py-1 rounded"
            />
            <span className="mx-2 text-gray-400">|</span>
            <div className="flex items-center text-sm text-gray-500">
              {documentTypes.find(t => t.id === documentType)?.icon}
              <span className="ml-1">{documentTypes.find(t => t.id === documentType)?.name}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-2 hover:bg-gray-100 rounded-md" 
              title="New Document"
              onClick={createNewDocument}
            >
              <FileText size={18} className="text-gray-700" />
            </button>
            <button 
              className="p-2 hover:bg-gray-100 rounded-md" 
              title="Save"
              onClick={saveDocument}
            >
              <Save size={18} className="text-gray-700" />
            </button>
            <div className="relative">
              <button 
                className="p-2 hover:bg-gray-100 rounded-md" 
                title="Export"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <Download size={18} className="text-gray-700" />
              </button>
              
              {showExportMenu && (
                <div 
                  ref={exportMenuRef}
                  className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg z-10 py-1 border border-gray-200"
                >
                  <button 
                    onClick={() => {
                      handleExport('markdown');
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Markdown (.md)
                  </button>
                  <button 
                    onClick={() => {
                      handleExport('pdf');
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    PDF (.pdf)
                  </button>
                  <button 
                    onClick={() => {
                      handleExport('docx');
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Word (.docx)
                  </button>
                </div>
              )}
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-md" title="Settings">
              <Settings size={18} className="text-gray-700" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Editor Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs for Editor/Chat */}
            <div className="flex border-b border-gray-200">
              <button 
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'editor' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Edit3 size={16} className="mr-1" />
                Editor
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'chat' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <MessageCircle size={16} className="mr-1" />
                Chat
              </button>
            </div>
            
            {/* Editor */}
            {activeTab === 'editor' && (
              <>
                <div className="flex-1 p-6 overflow-y-auto">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing or type '/' for commands..."
                    className="w-full h-full p-4 border-none focus:outline-none focus:ring-0 bg-transparent resize-none"
                  />
                </div>
                
                {/* Editor Controls */}
                <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {content.split(/\s+/).filter(Boolean).length} words
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className={`px-3 py-1 rounded-md text-sm flex items-center ${isGenerating ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                      onClick={generateSuggestions}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader className="mr-1 animate-spin" size={14} />
                          Processing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-1" size={14} />
                          Generate Suggestions
                        </>
                      )}
                    </button>
                    <button 
                      onClick={improveWriting}
                      disabled={isGenerating || !content.trim()}
                      className={`px-3 py-1 rounded-md text-sm flex items-center ${isGenerating || !content.trim() ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader className="mr-1 animate-spin" size={14} />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Send className="mr-1" size={14} />
                          Improve Writing
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {/* Chat Interface */}
            {activeTab === 'chat' && (
              <>
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                  <div className="max-w-3xl mx-auto">
                    {/* Clear chat button - only visible when there are messages */}
                    {chatMessages.length > 0 && (
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={clearChat}
                          className="flex items-center text-xs py-1 px-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Clear Chat
                        </button>
                      </div>
                    )}
                    
                    {/* Welcome message if no chat messages */}
                    {chatMessages.length === 0 && (
                      <div className="text-center mt-10 mb-6">
                        <Bot size={48} className="mx-auto mb-3 text-blue-500" />
                        <h3 className="text-xl font-medium mb-2">Chat with your AI assistant</h3>
                        <p className="text-gray-600 mb-3">Ask anything about writing, brainstorming, or get help with your document</p>
                        <p className="text-sm text-blue-600 mb-6">
                          Responses will be tailored to your selected <b>{documentTypes.find(t => t.id === documentType)?.name}</b> document type with a <b>{tone}</b> tone
                        </p>
                        
                        {/* Conversation starters */}
                        <div className="conversation-starters">
                          <h4>Try starting with:</h4>
                          <div className="starter-buttons">
                            {conversationStarters.map((starter, index) => (
                              <button 
                                key={index} 
                                className="starter-button"
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
                    <div className="space-y-4">
                      {chatMessages.map((msg, index) => (
                        <div 
                          key={index} 
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`relative p-3 rounded-lg ${
                              msg.role === 'user' 
                                ? 'bg-blue-500 text-white max-w-[80%]' 
                                : 'bg-white border border-gray-200 text-gray-800 max-w-[80%]'
                            }`}
                          >
                            {/* User avatar or AI indicator */}
                            {msg.role === 'assistant' && !msg.isTyping && (
                              <div className="absolute -left-2 -top-2 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                <Bot size={12} className="text-blue-600" />
                              </div>
                            )}
                            
                            {/* Message content */}
                            {msg.isTyping ? (
                              <div className="flex space-x-1 items-center h-6 py-3">
                                <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap">{msg.content}</div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Typing animation */}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="relative p-3 rounded-lg bg-white border border-gray-200 text-gray-800 max-w-[80%]">
                            <div className="absolute -left-2 -top-2 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <Bot size={12} className="text-blue-600" />
                            </div>
                            <div className="whitespace-pre-wrap">{typingText}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* For auto-scrolling to bottom */}
                      <div ref={chatEndRef} />
                    </div>
                  </div>
                </div>
                
                <div className="p-3 border-t border-gray-200 bg-white">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isGenerating && messageInput.trim() && generateAIResponse()}
                        placeholder="Type a message..."
                        className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={generateAIResponse}
                        disabled={isGenerating || !messageInput.trim()}
                        className={`p-3 rounded-r-lg ${isGenerating || !messageInput.trim() ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'} transition-colors`}
                      >
                        {isGenerating ? <Loader className="animate-spin" size={20} /> : <Send size={20} />}
                      </button>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Using: <span className="font-semibold">{getModelDisplayName(model)}</span>
                        <span className="ml-2">({documentTypes.find(t => t.id === documentType)?.name}, {tone})</span>
                        <button 
                          onClick={() => setShowUsageStats(!showUsageStats)}
                          className="ml-2 underline text-blue-500 hover:text-blue-700"
                        >
                          Usage Stats
                        </button>
                        
                        {showUsageStats && (
                          <div 
                            ref={usageStatsRef}
                            className="absolute bottom-16 left-4 w-64 bg-white rounded-md shadow-lg z-10 p-3 border border-gray-200 text-gray-800"
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
                            <div className="text-xs mt-2 text-gray-500">
                              Note: Token counts are estimates. Actual usage may vary.
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
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
            <div className="bg-white border-l border-gray-200 flex flex-col flex-shrink-0 relative resizable-panel" 
                 style={{ width: `${rightPanelWidth}px` }}>
              <div className="p-3 border-b border-gray-200 font-medium text-sm">
                AI Suggestions
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {suggestions.length === 0 && !isGenerating ? (
                  <div className="text-center text-gray-500 text-sm py-10">
                    <RefreshCw className="mx-auto mb-2" size={20} />
                    Click "Generate Suggestions" to get AI feedback on your writing
                  </div>
                ) : isGenerating ? (
                  <div className="text-center text-gray-500 text-sm py-10">
                    <Loader className="mx-auto mb-2 animate-spin" size={20} />
                    Analyzing your text...
                  </div>
                ) : (
                  suggestions.map(suggestion => (
                    <div 
                      key={suggestion.id} 
                      className={`p-3 rounded-md text-sm ${
                        suggestion.type === 'improvement' ? 'bg-blue-50' :
                        suggestion.type === 'grammar' ? 'bg-red-50' : 'bg-green-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-medium uppercase px-1.5 py-0.5 rounded ${
                          suggestion.type === 'improvement' ? 'bg-blue-100 text-blue-700' :
                          suggestion.type === 'grammar' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {suggestion.type}
                        </span>
                        <div className="flex space-x-1">
                          {(suggestion.type === 'alternative' || suggestion.originalContent) && (
                            <button 
                              onClick={() => applySuggestion(suggestion.id)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title={suggestion.originalContent ? "Revert to original" : "Apply suggestion"}
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button 
                            onClick={() => setSuggestions(suggestions.filter(s => s.id !== suggestion.id))}
                            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                            title="Dismiss"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2">{suggestion.text}</div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Right panel resizer */}
              <div
                ref={rightResizeRef}
                className={`resize-handle left-0 ${isDraggingRight ? 'active' : ''}`}
                onMouseDown={handleRightResizerMouseDown}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 