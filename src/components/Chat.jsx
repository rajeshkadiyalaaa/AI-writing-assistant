import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, User, Bot, Loader, RefreshCw, ArrowDown, MessageSquare,
  Wand2, Settings, Trash2, ChevronDown, Info, Check
} from 'lucide-react';
import axios from 'axios';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [error, setError] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  // Typing animation states
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [fullResponse, setFullResponse] = useState('');
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(5); // milliseconds per character
  
  // Conversation starters
  const conversationStarters = [
    "How can you help me with my writing?",
    "I need to write an email to my boss. Can you help me?",
    "Can you help me brainstorm blog post ideas?",
    "How do I improve my writing style?",
    "I need to create a summary of a long document"
  ];

  // Model descriptions and recommendations
  const modelDescriptions = {
    'openrouter/quasar-alpha': 'Excellent for professional writing, business documents, and academic content',
    'google/gemini-2.5-pro-exp-03-25:free': 'Strong at crafting concise and effective communications',
    'deepseek/deepseek-chat-v3-0324:free': 'Specialized in technical content and research writing'
  };

  // Content type to recommended model mapping
  const contentTypeModels = {
    'business': 'openrouter/quasar-alpha',
    'email': 'google/gemini-2.5-pro-exp-03-25:free',
    'technical': 'deepseek/deepseek-chat-v3-0324:free'
  };

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const settingsMenuRef = useRef(null);

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get('/api/models');
        setModels(response.data.models);
        setSelectedModel(response.data.default_model);
      } catch (err) {
        console.error('Error fetching models:', err);
        setError('Failed to load available models');
      }
    };
    
    fetchModels();
  }, []);

  // Handle clicks outside the settings menu
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
  }, []);

  // Typing animation effect
  useEffect(() => {
    if (isTyping && typingIndex < fullResponse.length) {
      const timer = setTimeout(() => {
        setTypingText(prev => prev + fullResponse[typingIndex]);
        setTypingIndex(prevIndex => prevIndex + 1);
      }, typingSpeed);
      
      return () => clearTimeout(timer);
    } else if (isTyping && typingIndex >= fullResponse.length) {
      setIsTyping(false);
    }
  }, [isTyping, typingIndex, fullResponse, typingSpeed]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle scroll events to show/hide scroll button
  useEffect(() => {
    const handleScroll = () => {
      if (!messagesContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };
    
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (userInput = input) => {
    if (!userInput.trim()) return;
    
    setError('');
    
    // Add user message
    const userMessage = {
      role: 'user',
      content: userInput
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setLoading(true);
    
    // Create placeholder for assistant's response
    const tempId = Date.now().toString();
    setMessages(prevMessages => [
      ...prevMessages, 
      { role: 'assistant', content: '', tempId, model: selectedModel }
    ]);
    
    try {
      // Use the selected model without showing recommendation popup
      const response = await axios.post('/api/chat', {
        message: userInput,
        model: selectedModel
      });
      
      // Check if there's an error in the response
      if (response.data.error) {
        console.error('API Error:', response.data.error);
        throw new Error(response.data.error);
      }
      
      // Set up typing animation with the received response
      setFullResponse(response.data.response);
      setTypingText('');
      setTypingIndex(0);
      setIsTyping(true);
      
      // Update the placeholder message with the full response (will be revealed gradually)
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.tempId === tempId 
            ? { ...msg, content: response.data.response, tempId: undefined } 
            : msg
        )
      );
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Create a user-friendly error message based on the error
      let errorMessage = 'Failed to get response. Please try again.';
      
      if (err.response) {
        // The request was made and the server responded with a non-2xx status code
        errorMessage = `Server error: ${err.response.data.error || err.response.statusText}`;
        console.error('Response data:', err.response.data);
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your connection.';
      } else if (err.message) {
        // Use the error message if available
        errorMessage = `Error: ${err.message}`;
      }
      
      setError(errorMessage);
      
      // Remove the placeholder message
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.tempId !== tempId)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
  };

  // Get the display name from the model ID
  const getModelDisplayName = (modelId) => {
    const model = models.find(m => m.id === modelId);
    return model ? model.name : modelId.split('/').pop();
  };

  // Get recommendation tag based on model
  const getModelRecommendation = (modelId) => {
    const recommendations = {
      'openrouter/quasar-alpha': '(Recommended for Business)',
      'google/gemini-2.5-pro-exp-03-25:free': '(Recommended for Email)',
      'deepseek/deepseek-chat-v3-0324:free': '(Recommended for Technical)'
    };
    
    return recommendations[modelId] || '';
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-title">
          <MessageSquare size={20} />
          <h2>Chat Assistant</h2>
        </div>
        
        <div className="model-info">
          <div className="model-display">
            <span className="model-name">
              Currently using: <strong>{getModelDisplayName(selectedModel)}</strong> {getModelRecommendation(selectedModel)}
            </span>
          </div>
          
          <button 
            className="settings-btn" 
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            title="Settings"
          >
            <Settings size={18} />
          </button>
          
          {showSettingsMenu && (
            <div className="settings-menu" ref={settingsMenuRef}>
              <h4>Select Model</h4>
              {models.map((model) => (
                <div 
                  key={model.id} 
                  className={`model-option ${selectedModel === model.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setShowSettingsMenu(false);
                    // Clear chat messages when model changes
                    setMessages([]);
                    setError('');
                  }}
                >
                  <div className="model-option-name">
                    {model.name}
                    {selectedModel === model.id && <Check size={14} className="check-icon" />}
                  </div>
                  <div className="model-option-desc">
                    {modelDescriptions[model.id] || 'General-purpose AI model'}
                  </div>
                </div>
              ))}
              <div className="settings-divider"></div>
              <button 
                className="clear-chat-option" 
                onClick={() => {
                  clearChat();
                  setShowSettingsMenu(false);
                }}
                disabled={messages.length === 0}
              >
                <Trash2 size={14} />
                Clear conversation
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="welcome-message">
            <div className="welcome-header">
              <div className="welcome-icon">
                <Bot size={32} />
              </div>
              <h3>How can I help you today?</h3>
              <p>Ask me anything about writing, editing, or content generation!</p>
            </div>
            
            <div className="conversation-starters">
              <h4>Try starting with:</h4>
              <div className="starter-buttons">
                {conversationStarters.map((starter, index) => (
                  <button 
                    key={index} 
                    className="starter-button"
                    onClick={() => handleSubmit(starter)}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-avatar">
                {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              
              <div className="message-content">
                {message.role === 'assistant' && message.tempId && !isTyping ? (
                  <div className="typing-indicator">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                ) : (
                  <>
                    <div className="message-text">
                      {message.role === 'assistant' && message === messages[messages.length - 1] && isTyping 
                        ? typingText 
                        : message.content}
                    </div>
                    
                    {message.role === 'assistant' && message.model && (
                      <div className="message-model">
                        {message.model.split('/').pop()}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <div ref={messagesEndRef} />
      </div>
      
      {showScrollButton && (
        <button 
          className="scroll-bottom-btn"
          onClick={scrollToBottom}
          title="Scroll to bottom"
        >
          <ChevronDown size={20} />
        </button>
      )}
      
      <div className="chat-input">
        <textarea
          className="chat-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={loading}
          rows={1}
        />
        
        <button 
          className="send-button"
          onClick={() => handleSubmit()}
          disabled={!input.trim() || loading}
        >
          {loading ? <RefreshCw size={18} className="spinner" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
};

export default Chat; 