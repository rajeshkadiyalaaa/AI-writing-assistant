import { useState, useRef } from 'react';
import api from '../api';
import { assertApiSuccess, formatApiError, isCancelledError } from '../lib/errors';
import { normalizeSuggestions } from '../lib/suggestions';
import { applySuggestionToContent } from '../lib/applySuggestion';
import { replaceTextRange } from '../lib/editorUtils';
import useAbortableApi from './useAbortableApi';

export default function useSuggestions({
  content,
  documentType,
  tone,
  model,
  apiKeySet,
  getModelDisplayName,
  addHistory,
  showNotification,
  setShowApiKeyModal,
  setContent,
  pushSnapshot,
  onTokenUsage,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [comparePreview, setComparePreview] = useState(null);
  const [pendingApply, setPendingApply] = useState(null);
  const abortApi = useAbortableApi();
  const lastImproveArgsRef = useRef(null);

  const requireApiKey = () => {
    if (apiKeySet) return true;
    showNotification('Connect your OpenRouter API key first', 'warning');
    setShowApiKeyModal(true);
    return false;
  };

  const fetchSuggestions = async (signal) => {
    const response = await api.suggestions({ content, documentType, tone, model }, { signal });
    const data = assertApiSuccess(response);
    onTokenUsage?.(data.usage);

    let suggestionsData = data.suggestions;
    if (!suggestionsData && data.raw_suggestions) {
      suggestionsData = { improvement: [data.raw_suggestions] };
    }

    const normalized = normalizeSuggestions(suggestionsData);
    if (normalized.length === 0) {
      setSuggestions([
        {
          id: Date.now(),
          type: 'improvement',
          text: 'No specific suggestions returned. Try a longer draft or a different model.',
        },
      ]);
    } else {
      setSuggestions(normalized);
    }
    addHistory(`Generated suggestions with ${getModelDisplayName(model)}`);
  };

  const generateSuggestions = async () => {
    if (!content.trim() || isGenerating) return;
    if (!requireApiKey()) return;

    setIsGenerating(true);
    abortApi.clearError();
    try {
      await abortApi.run(fetchSuggestions);
    } catch (error) {
      if (isCancelledError(error)) return;
      showNotification(`Suggestions failed: ${formatApiError(error)}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const openComparePreview = ({
    beforeDisplay,
    afterDisplay,
    afterFull,
    title,
    subtitle,
    selectionLabel,
    historyAction,
  }) => {
    setComparePreview({
      before: beforeDisplay,
      after: afterDisplay,
      afterFull,
      title: title || 'Review changes',
      subtitle,
      selectionLabel,
      historyAction,
    });
  };

  const fetchImprove = async (signal, { selectedText, selectionStart, selectionEnd } = {}) => {
    const isSelection = Boolean(selectedText?.trim());
    const response = await api.improve(
      {
        content,
        selectedText: isSelection ? selectedText : undefined,
        selectionStart: isSelection ? selectionStart : undefined,
        selectionEnd: isSelection ? selectionEnd : undefined,
        targetAudience: documentType,
        readingLevel: documentType === 'academic' ? 'advanced' : 'intermediate',
        additionalInstructions: `Use a ${tone} tone.`,
        model,
      },
      { signal }
    );

    const data = assertApiSuccess(response);
    if (!data.improved_content) {
      throw new Error('No improved content received from the server');
    }
    onTokenUsage?.(data.usage);

    const improvedPassage = data.improved_content;
    const afterFull = isSelection
      ? replaceTextRange(content, selectionStart, selectionEnd, improvedPassage)
      : improvedPassage;

    openComparePreview({
      beforeDisplay: isSelection ? selectedText : content,
      afterDisplay: improvedPassage,
      afterFull,
      title: isSelection ? 'Improve selection' : 'Rewrite for clarity',
      subtitle: 'Compare before accepting — your document is not changed until you confirm.',
      selectionLabel: isSelection
        ? `${selectedText.split(/\s+/).filter(Boolean).length} words selected`
        : null,
      historyAction: isSelection
        ? `Improved selection with ${getModelDisplayName(model)}`
        : `Improved writing with ${getModelDisplayName(model)}`,
    });
  };

  const runImprove = async (args = {}) => {
    if (!content.trim() || isGenerating) return;
    if (!requireApiKey()) return;

    lastImproveArgsRef.current = args;
    setIsGenerating(true);
    abortApi.clearError();

    try {
      await abortApi.run((signal) => fetchImprove(signal, args));
    } catch (error) {
      if (isCancelledError(error)) return;
      showNotification(`Improve failed: ${formatApiError(error)}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const improveWriting = () => runImprove();

  const improveSelection = (selection) => {
    if (!selection?.text?.trim()) {
      showNotification('Select text in the editor first', 'warning');
      return;
    }
    runImprove({
      selectedText: selection.text,
      selectionStart: selection.start,
      selectionEnd: selection.end,
    });
  };

  const acceptCompare = () => {
    if (!comparePreview) return;
    pushSnapshot?.('Before improve');
    setContent(comparePreview.afterFull);
    addHistory(comparePreview.historyAction);
    setComparePreview(null);
    showNotification('Changes applied', 'success');
  };

  const rejectCompare = () => {
    setComparePreview(null);
    showNotification('Kept original text', 'info');
  };

  const applySuggestion = (id) => {
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion) return;

    const result = applySuggestionToContent(content, suggestion);

    if (result.ok && result.mode === 'replace') {
      pushSnapshot?.('Before apply suggestion');
      setContent(result.content);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      showNotification('Suggestion applied', 'success');
      return;
    }

    if (result.ok && result.mode === 'revert') {
      pushSnapshot?.('Before revert');
      setContent(result.content);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      showNotification('Reverted to previous version', 'info');
      return;
    }

    if (result.ok && result.mode === 'append') {
      pushSnapshot?.('Before apply suggestion');
      setContent(result.content);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      showNotification('Alternative appended', 'success');
      return;
    }

    const previewContent =
      result.mode === 'needs_preview'
        ? (() => {
            const trimmed = result.parsed.text.replace(/^\d+\.\s*/, '');
            const paragraphs = content.split('\n\n');
            paragraphs[0] = `${paragraphs[0].trim()} ${trimmed}`.trim();
            return paragraphs.join('\n\n').slice(0, 500);
          })()
        : null;

    const isNotFound = result.mode === 'not_found';

    setPendingApply({
      id,
      suggestion: result.parsed,
      previewContent,
      warning: result.reason,
      canForceApply: result.mode === 'needs_preview',
      isNotFound,
    });
  };

  const acceptPendingApply = () => {
    if (!pendingApply?.canForceApply) return;
    pushSnapshot?.('Before apply suggestion');
    const paragraphs = content.split('\n\n');
    const trimmed = pendingApply.suggestion.text.replace(/^\d+\.\s*/, '');
    paragraphs[0] = `${paragraphs[0].trim()} ${trimmed}`.trim();
    setContent(paragraphs.join('\n\n'));
    setSuggestions((prev) => prev.filter((s) => s.id !== pendingApply.id));
    setPendingApply(null);
    showNotification('Suggestion applied to opening paragraph', 'success');
  };

  const rejectPendingApply = () => setPendingApply(null);

  const cancelRequest = () => {
    abortApi.cancel();
    setIsGenerating(false);
  };

  const retryRequest = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    abortApi.clearError();
    try {
      await abortApi.retry();
    } catch (error) {
      if (!isCancelledError(error)) {
        showNotification(formatApiError(error), 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    suggestions,
    setSuggestions,
    isGenerating,
    generateSuggestions,
    improveWriting,
    improveSelection,
    applySuggestion,
    comparePreview,
    acceptCompare,
    rejectCompare,
    pendingApply,
    acceptPendingApply,
    rejectPendingApply,
    cancelRequest,
    retryRequest,
    requestIsSlow: abortApi.isSlow,
    requestError: abortApi.lastError,
    canRetryRequest: abortApi.canRetry,
  };
};
