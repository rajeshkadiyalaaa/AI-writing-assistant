import React, { createContext, useContext, useMemo } from 'react';
import useChat from '../hooks/useChat';

const ChatStateContext = createContext(null);
const ChatActionsContext = createContext(null);

export function StudioChatProvider({ config, children }) {
  const chat = useChat(config);

  const actions = useMemo(
    () => ({
      setChatMessages: chat.setChatMessages,
      setMessageInput: chat.setMessageInput,
      generateAIResponse: chat.generateAIResponse,
      clearChat: chat.clearChat,
      selectConversationStarter: chat.selectConversationStarter,
      cancelRequest: chat.cancelRequest,
      retryRequest: chat.retryRequest,
    }),
    [
      chat.setChatMessages,
      chat.setMessageInput,
      chat.generateAIResponse,
      chat.clearChat,
      chat.selectConversationStarter,
      chat.cancelRequest,
      chat.retryRequest,
    ]
  );

  const state = useMemo(
    () => ({
      chatMessages: chat.chatMessages,
      messageInput: chat.messageInput,
      isGenerating: chat.isGenerating,
      conversationStarters: chat.conversationStarters,
      chatEndRef: chat.chatEndRef,
      requestIsSlow: chat.requestIsSlow,
      requestError: chat.requestError,
      canRetryRequest: chat.canRetryRequest,
      showModelThinking: chat.showModelThinking,
    }),
    [
      chat.chatMessages,
      chat.messageInput,
      chat.isGenerating,
      chat.conversationStarters,
      chat.requestIsSlow,
      chat.requestError,
      chat.canRetryRequest,
      chat.showModelThinking,
    ]
  );

  return (
    <ChatActionsContext.Provider value={actions}>
      <ChatStateContext.Provider value={state}>{children}</ChatStateContext.Provider>
    </ChatActionsContext.Provider>
  );
}

export function useStudioChatState() {
  const ctx = useContext(ChatStateContext);
  if (!ctx) throw new Error('useStudioChatState must be used within StudioChatProvider');
  return ctx;
}

export function useStudioChatActions() {
  const ctx = useContext(ChatActionsContext);
  if (!ctx) throw new Error('useStudioChatActions must be used within StudioChatProvider');
  return ctx;
}
