/**
 * Custom hook for chat management
 */
import { useState, useRef, useEffect } from 'react';
import { generateAIResponse as generateResponse } from '../utils/apiUtils';
import { estimateTokens } from '../utils/documentUtils';

/**
 * Custom hook for chat management
 * @param {Object} params - Parameters
 * @param {Function} params.showNotification - Function to show notifications
 * @param {string} params.model - The model to use
 * @param {string} params.documentType - The document type
 * @param {string} params.tone - The tone to use
 * @param {number} params.temperature - The temperature setting
 * @param {Function} params.getModelDisplayName - Function to get model display name
 * @param {Function} params.setHistory - Function to update history
 * @returns {Object} Chat management state and functions
 */
export const useChat = ({ 
  showNotification, 
  model, 
  documentType, 
  tone, 
  temperature,
  getModelDisplayName,
  setHistory
}) => {
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [fullResponse, setFullResponse] = useState('');
  const [typingSpeed, setTypingSpeed] = useState(5); // ms per character
  const [tokenUsage, setTokenUsage] = useState({ count: 0, cost: 0 });
  
  // Refs
  const chatEndRef = useRef(null);

  // Auto-scroll to the bottom of chat when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, typingText]);

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
  }, [typingText, isTyping, fullResponse, typingSpeed]);

  /**
   * Finish typing animation and add the message to the chat
   */
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

  /**
   * Update token usage
   * @param {number} messageCount - The number of messages
   * @param {number} responseLength - The length of the response
   */
  const updateTokenUsage = (messageCount, responseLength) => {
    // Estimate tokens in the response
    const tokens = estimateTokens(responseLength) + (messageCount * 4);
    
    // Update usage
    setTokenUsage(prev => ({
      count: prev.count + tokens,
      cost: prev.cost + (tokens * 0.000002) // Simple cost estimate
    }));
  };

  /**
   * Generate an AI response
   * @returns {Promise<boolean>} Whether the generation was successful
   */
  const generateAIResponse = async () => {
    if (!messageInput.trim()) return false;
    
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
      const response = await generateResponse(
        updatedMessages,
        model,
        documentType,
        tone,
        temperature
      );
      
      // Get the response text
      const responseText = response.response || "I'm not sure how to respond to that. Can you try rephrasing?";
      
      // Update token usage estimate
      updateTokenUsage(updatedMessages.length, responseText);
      
      // Start the animation with the typing indicator still in the chat
      setFullResponse(responseText);
      setTypingText('');
      setIsTyping(true);
      
      // Add to history
      const now = new Date();
      setHistory(prev => [...prev, {
        id: prev.length + 1,
        timestamp: now.toLocaleTimeString(),
        action: `Chat with ${getModelDisplayName(model)} (${documentType}, ${tone})`,
        version: prev.length + 1
      }]);
      
      return true;
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Add error message to chat
      setChatMessages([...updatedMessages, {
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
      
      showNotification('Failed to generate AI response: ' + (error.message || 'Unknown error'), 'error');
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Clear the chat messages
   */
  const clearChat = () => {
    if (chatMessages.length > 0 && window.confirm('Are you sure you want to clear all chat messages?')) {
      setChatMessages([]);
      showNotification('Chat cleared', 'info');
    }
  };

  /**
   * Insert a conversation starter
   * @param {string} starter - The conversation starter to insert
   */
  const selectConversationStarter = (starter) => {
    setMessageInput(starter);
  };

  return {
    // State
    chatMessages,
    messageInput,
    isGenerating,
    isTyping,
    typingText,
    tokenUsage,
    chatEndRef,
    
    // State setters
    setMessageInput,
    setChatMessages,
    
    // Functions
    generateAIResponse,
    clearChat,
    selectConversationStarter
  };
}; 