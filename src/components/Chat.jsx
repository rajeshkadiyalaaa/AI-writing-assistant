import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, User, Bot, Loader, RefreshCw, ArrowDown, MessageSquare,
  Wand2, Settings, Trash2, ChevronDown
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

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

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

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-title">
          <MessageSquare size={20} />
          <h2>Chat Assistant</h2>
        </div>
        
        <div className="model-selector">
          <label htmlFor="model-select">Model:</label>
          <select 
            id="model-select"
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              // Clear chat messages when model changes
              setMessages([]);
              setError('');
            }}
            disabled={loading}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        
        <button 
          className="clear-chat-btn" 
          onClick={clearChat}
          title="Clear chat"
          disabled={loading || messages.length === 0}
        >
          <Trash2 size={18} />
        </button>
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