import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '../api';
import { assertApiSuccess, formatApiError, isCancelledError } from '../lib/errors';
import { streamChatGenerate } from '../lib/streamChat';
import { getConversationStarters } from '../constants/conversationStarters';
import useAbortableApi from './useAbortableApi';

function extractMeta(data) {
  const stats = data.statistics || data.enhanced_data?.statistics;
  const score = data.quality_score ?? data.enhanced_data?.quality_metrics?.overall_quality_score;
  if (!stats && score == null) return null;
  return {
    wordCount: stats?.word_count,
    qualityScore: score != null ? Math.round(score * 100) : null,
  };
}

export default function useChat({
  model,
  documentType,
  tone,
  temperature,
  addHistory,
  onTokenUsage,
  getModelDisplayName,
}) {
  const conversationStarters = useMemo(
    () => getConversationStarters(documentType),
    [documentType]
  );
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef(null);
  const lastTurnRef = useRef(null);
  const abortApi = useAbortableApi();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChatTurn = useCallback(
    async (updatedMessages, signal) => {
      const payload = {
        messages: updatedMessages,
        model,
        documentType,
        tone,
        temperature,
      };

      let streamed = '';
      let usageFromStream = null;

      const applyStreamChunk = (full) => {
        streamed = full;
        setChatMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: full, streaming: true },
        ]);
      };

      try {
        await streamChatGenerate(payload, {
          signal,
          onChunk: applyStreamChunk,
          onUsage: (u) => {
            usageFromStream = u;
          },
        });
      } catch (streamErr) {
        if (isCancelledError(streamErr)) throw streamErr;
        const response = await api.generate(payload, { signal });
        const data = assertApiSuccess(response);
        streamed = data.response || "I'm not sure how to respond to that. Can you try rephrasing?";
        usageFromStream = data.usage;
        const meta = extractMeta(data);
        onTokenUsage?.(usageFromStream, updatedMessages.length, streamed);
        setChatMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: streamed, meta },
        ]);
        addHistory(`Chat with ${getModelDisplayName(model)} (${documentType}, ${tone})`);
        return;
      }

      if (!streamed.trim()) {
        streamed = "I'm not sure how to respond to that. Can you try rephrasing?";
      }

      onTokenUsage?.(usageFromStream, updatedMessages.length, streamed);
      setChatMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: streamed },
      ]);
      addHistory(`Chat with ${getModelDisplayName(model)} (${documentType}, ${tone})`);
    },
    [model, documentType, tone, temperature, addHistory, onTokenUsage, getModelDisplayName]
  );

  const runTurn = useCallback(
    async (updatedMessages) => {
      lastTurnRef.current = updatedMessages;
      await abortApi.run((signal) => sendChatTurn(updatedMessages, signal));
    },
    [abortApi, sendChatTurn]
  );

  const generateAIResponse = async () => {
    if (!messageInput.trim() || isGenerating) return;

    const userMessage = { role: 'user', content: messageInput };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages([...updatedMessages, { role: 'assistant', content: '', streaming: true }]);
    setMessageInput('');
    setIsGenerating(true);
    abortApi.clearError();

    try {
      await runTurn(updatedMessages);
    } catch (err) {
      if (isCancelledError(err)) {
        setChatMessages(updatedMessages);
        return;
      }
      setChatMessages([
        ...updatedMessages,
        { role: 'assistant', content: `Sorry — ${formatApiError(err)}`, isError: true },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const retryLast = async () => {
    const updatedMessages = lastTurnRef.current;
    if (!updatedMessages || isGenerating) return;

    setChatMessages([...updatedMessages, { role: 'assistant', content: '', streaming: true }]);
    setIsGenerating(true);
    abortApi.clearError();

    try {
      await abortApi.retry();
    } catch (err) {
      if (!isCancelledError(err)) {
        setChatMessages([
          ...updatedMessages,
          { role: 'assistant', content: `Sorry — ${formatApiError(err)}`, isError: true },
        ]);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const clearChat = () => {
    abortApi.cancel();
    setIsGenerating(false);
    setChatMessages([]);
    lastTurnRef.current = null;
  };

  return {
    chatMessages,
    setChatMessages,
    messageInput,
    setMessageInput,
    isGenerating,
    generateAIResponse,
    clearChat,
    conversationStarters,
    selectConversationStarter: (starter) => setMessageInput(starter),
    chatEndRef,
    cancelRequest: abortApi.cancel,
    retryRequest: retryLast,
    requestIsSlow: abortApi.isSlow,
    requestError: abortApi.lastError,
    canRetryRequest: Boolean(lastTurnRef.current && abortApi.lastError),
  };
};
