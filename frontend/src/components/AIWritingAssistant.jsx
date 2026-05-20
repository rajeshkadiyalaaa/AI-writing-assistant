import React, { useState, useRef, useCallback } from 'react';
import { PenTool, FileText, BookOpen, Mail, Edit3 } from 'lucide-react';
import {
  DEFAULT_MODEL_ID,
  getModelDisplayName as resolveModelName,
  isRecommendedModel as checkRecommendedModel,
  estimateCost as estimateModelCost,
} from '../constants/models';
import { EMPTY_USAGE, mergeUsage, normalizeUsage, estimateUsageFromText } from '../lib/tokenUsage';
import useToast from '../hooks/useToast';
import useApiKey from '../hooks/useApiKey';
import useDarkMode from '../hooks/useDarkMode';
import usePanelResize from '../hooks/usePanelResize';
import useDocuments from '../hooks/useDocuments';
import useChat from '../hooks/useChat';
import useSuggestions from '../hooks/useSuggestions';
import useExport from '../hooks/useExport';
import useModels from '../hooks/useModels';
import useClickOutside from '../hooks/useClickOutside';
import useDraftAutosave from '../hooks/useDraftAutosave';
import useEditorHistory from '../hooks/useEditorHistory';
import {
  readTextareaSelection,
  replaceTextRange,
  insertAtCursor,
  appendToDocument,
} from '../lib/editorUtils';
import { formatApiError } from '../lib/errors';
import ApiKeyPrompt from './studio/ApiKeyPrompt';
import WritingStudioView from './studio/WritingStudioView';

const DOCUMENT_TYPES = [
  { id: 'general', name: 'General', icon: <FileText size={16} /> },
  { id: 'email', name: 'Email', icon: <Mail size={16} /> },
  { id: 'academic', name: 'Academic', icon: <BookOpen size={16} /> },
  { id: 'business', name: 'Business', icon: <PenTool size={16} /> },
  { id: 'creative', name: 'Creative', icon: <Edit3 size={16} /> },
];

/** Kept minimal — document type handles context; tone adjusts voice only */
const TONE_OPTIONS = ['professional', 'casual', 'formal'];

export default function AIWritingAssistant() {
  const { showToast, toastMessage, toastType, showNotification } = useToast();
  const apiKey = useApiKey(showNotification);
  const { isDarkMode, toggleDarkMode } = useDarkMode(showNotification);
  const panel = usePanelResize();

  const [content, setContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [documentType, setDocumentType] = useState('general');
  const [tone, setTone] = useState('professional');
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [temperature, setTemperature] = useState(0.7);
  const [history, setHistory] = useState([]);
  const [activeSidebarTab, setActiveSidebarTab] = useState('format');
  const [activeTab, setActiveTab] = useState('editor');
  const [mobilePanel, setMobilePanel] = useState(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showUsageStats, setShowUsageStats] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [showTemperatureInfo, setShowTemperatureInfo] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(EMPTY_USAGE);

  const settingsMenuRef = useRef(null);
  const usageStatsRef = useRef(null);
  const temperatureInfoRef = useRef(null);
  const modelInfoRef = useRef(null);
  const customModelFormRef = useRef(null);
  const textareaRef = useRef(null);
  const [selection, setSelection] = useState({ start: 0, end: 0, text: '' });

  const updateSelection = useCallback(() => {
    setSelection(readTextareaSelection(textareaRef.current, content));
  }, [content]);

  const hasSelection = Boolean(selection.text?.trim());

  useClickOutside(settingsMenuRef, showSettingsMenu, () => setShowSettingsMenu(false));
  useClickOutside(usageStatsRef, showUsageStats, () => setShowUsageStats(false));
  useClickOutside(temperatureInfoRef, showTemperatureInfo, () => setShowTemperatureInfo(false));
  useClickOutside(modelInfoRef, showModelInfo, () => setShowModelInfo(false));

  const addHistory = useCallback((action) => {
    setHistory((prev) => [
      ...prev,
      { id: prev.length + 1, timestamp: new Date().toLocaleTimeString(), action, version: prev.length + 1 },
    ]);
  }, []);

  const onTokenUsage = useCallback((usage, messageCount, responseText) => {
    const normalized = normalizeUsage(usage);
    if (normalized) {
      setTokenUsage((prev) => mergeUsage(prev, normalized));
    } else if (responseText != null) {
      const est = estimateUsageFromText(messageCount, responseText);
      setTokenUsage((prev) => mergeUsage(prev, est));
    }
  }, []);

  const draft = useDraftAutosave({
    content,
    documentTitle,
    documentType,
    tone,
    model,
    temperature,
  });

  const editorHistory = useEditorHistory({
    content,
    documentTitle,
    documentType,
    tone,
    model,
    temperature,
    setContent,
    setDocumentTitle,
    setDocumentType,
    setTone,
    setModel,
    setTemperature,
  });

  const models = useModels({ model, setModel, documentType, showNotification });
  const getModelDisplayName = (id) => resolveModelName(id, models.modelOptions);
  const chat = useChat({
    model, documentType, tone, temperature, addHistory, onTokenUsage, getModelDisplayName,
  });
  const suggestions = useSuggestions({
    content, documentType, tone, model, apiKeySet: apiKey.apiKeySet,
    getModelDisplayName, addHistory, showNotification,
    setShowApiKeyModal: apiKey.setShowApiKeyModal, setContent,
    pushSnapshot: editorHistory.pushSnapshot,
    onTokenUsage,
  });
  const documents = useDocuments({
    content,
    documentTitle,
    documentType,
    tone,
    model,
    temperature,
    setContent,
    setDocumentTitle,
    setDocumentType,
    setTone,
    setModel,
    setTemperature,
    setSuggestions: suggestions.setSuggestions,
    setActiveTab,
    addHistory,
    showNotification,
    clearDraft: draft.clearDraft,
    resetEditorHistory: editorHistory.resetHistory,
    skipNextAutosave: draft.skipNextAutosave,
  });
  const exportHook = useExport({ content, documentTitle, showNotification });

  const handleRestoreDraft = () => {
    draft.restoreDraft({
      setContent,
      setDocumentTitle,
      setDocumentType,
      setTone,
      setModel,
      setTemperature,
    });
    editorHistory.resetHistory();
    showNotification('Draft restored', 'success');
  };

  const handleUndo = () => {
    if (editorHistory.undo()) {
      showNotification('Undone', 'info');
    }
  };

  const handleRedo = () => {
    if (editorHistory.redo()) {
      showNotification('Redone', 'info');
    }
  };

  const handleRestoreVersion = (versionId) => {
    if (editorHistory.restoreVersion(versionId)) {
      showNotification('Version restored', 'success');
    }
  };

  const insertChatIntoEditor = useCallback(
    (text, mode) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      const sel = readTextareaSelection(textareaRef.current, content);

      if (mode === 'replace' && !sel.text.trim()) {
        showNotification('Select text in the editor first', 'warning');
        setActiveTab('editor');
        return;
      }

      editorHistory.pushSnapshot('Before insert from chat');

      let next = content;
      let cursor = sel.start;

      if (mode === 'append') {
        const result = appendToDocument(content, trimmed);
        next = result.content;
        cursor = result.cursor;
      } else if (mode === 'replace') {
        next = replaceTextRange(content, sel.start, sel.end, trimmed);
        cursor = sel.start + trimmed.length;
      } else {
        const pos = sel.start;
        const result = insertAtCursor(content, pos, trimmed);
        next = result.content;
        cursor = result.cursor;
      }

      setContent(next);
      setActiveTab('editor');
      addHistory('Inserted chat reply into editor');
      showNotification('Inserted into editor', 'success');

      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(cursor, cursor);
        }
        updateSelection();
      });
    },
    [content, editorHistory, addHistory, showNotification, updateSelection]
  );

  const isRecommendedModelFn = (id) => checkRecommendedModel(id, documentType, models.modelOptions);
  const estimateCostFn = (tokens, id) => estimateModelCost(tokens, id, models.modelOptions);
  const renderApiKeyPrompt = () => (
    <ApiKeyPrompt isDarkMode={isDarkMode} onOpenModal={() => apiKey.setShowApiKeyModal(true)} />
  );
  const isGenerating = chat.isGenerating || suggestions.isGenerating;
  const activeRequest = chat.isGenerating
    ? {
        isSlow: chat.requestIsSlow,
        error: chat.requestError ? formatApiError(chat.requestError) : null,
        canRetry: chat.canRetryRequest,
        onCancel: chat.cancelRequest,
        onRetry: chat.retryRequest,
        label: 'Chat',
      }
    : suggestions.isGenerating
      ? {
          isSlow: suggestions.requestIsSlow,
          error: suggestions.requestError ? formatApiError(suggestions.requestError) : null,
          canRetry: suggestions.canRetryRequest,
          onCancel: suggestions.cancelRequest,
          onRetry: suggestions.retryRequest,
          label: 'Assist',
        }
      : null;

  return (
    <WritingStudioView
      p={{
        isDarkMode,
        isDraggingLeft: panel.isDraggingLeft,
        isDraggingRight: panel.isDraggingRight,
        apiKeySet: apiKey.apiKeySet,
        setShowApiKeyModal: apiKey.setShowApiKeyModal,
        leftPanelWidth: panel.leftPanelWidth,
        rightPanelWidth: panel.rightPanelWidth,
        leftResizeRef: panel.leftResizeRef,
        rightResizeRef: panel.rightResizeRef,
        handleLeftResizerMouseDown: panel.handleLeftResizerMouseDown,
        handleRightResizerMouseDown: panel.handleRightResizerMouseDown,
        mobilePanel,
        setMobilePanel,
        documentTitle,
        setDocumentTitle,
        documentTypes: DOCUMENT_TYPES,
        documentType,
        createNewDocument: documents.createNewDocument,
        saveDocument: documents.saveDocument,
        savedDocuments: documents.savedDocuments,
        loadDocument: documents.loadDocument,
        deleteDocument: documents.deleteDocument,
        pendingDraft: draft.pendingDraft,
        draftTime: draft.formatDraftTime(),
        onRestoreDraft: handleRestoreDraft,
        onDismissDraft: draft.dismissDraft,
        canUndo: editorHistory.canUndo,
        canRedo: editorHistory.canRedo,
        onUndo: handleUndo,
        onRedo: handleRedo,
        editorVersions: editorHistory.versions,
        onRestoreVersion: handleRestoreVersion,
        showExportMenu: exportHook.showExportMenu,
        setShowExportMenu: exportHook.setShowExportMenu,
        exportMenuRef: exportHook.exportMenuRef,
        handleExport: exportHook.handleExport,
        showSettingsMenu,
        setShowSettingsMenu,
        settingsMenuRef,
        toggleDarkMode,
        showUsageStats,
        setShowUsageStats,
        usageStatsRef,
        tokenUsage,
        estimateCost: estimateCostFn,
        model,
        activeTab,
        setActiveTab,
        activeSidebarTab,
        setActiveSidebarTab,
        tone,
        setTone,
        toneOptions: TONE_OPTIONS,
        setDocumentType,
        modelOptions: models.modelOptions,
        modelsSource: models.modelsSource,
        autoPickModel: models.autoPickModel,
        setAutoPickModelPref: models.setAutoPickModelPref,
        refreshModels: models.refreshModels,
        isRefreshingModels: models.isRefreshingModels,
        setModel,
        setChatMessages: chat.setChatMessages,
        temperature,
        setTemperature,
        showModelInfo,
        setShowModelInfo,
        showTemperatureInfo,
        setShowTemperatureInfo,
        getModelDisplayName,
        isRecommendedModel: isRecommendedModelFn,
        removeCustomModel: models.removeCustomModel,
        setShowCustomModelForm: models.setShowCustomModelForm,
        history,
        content,
        setContent,
        chatMessages: chat.chatMessages,
        messageInput: chat.messageInput,
        setMessageInput: chat.setMessageInput,
        generateAIResponse: chat.generateAIResponse,
        clearChat: chat.clearChat,
        conversationStarters: chat.conversationStarters,
        selectConversationStarter: chat.selectConversationStarter,
        chatIsGenerating: chat.isGenerating,
        chatCancelRequest: chat.cancelRequest,
        chatEndRef: chat.chatEndRef,
        suggestions: suggestions.suggestions,
        renderApiKeyPrompt,
        generateSuggestions: suggestions.generateSuggestions,
        improveWriting: suggestions.improveWriting,
        improveSelection: () => suggestions.improveSelection(selection),
        hasSelection,
        activeRequest,
        applySuggestion: suggestions.applySuggestion,
        setSuggestions: suggestions.setSuggestions,
        comparePreview: suggestions.comparePreview,
        acceptCompare: suggestions.acceptCompare,
        rejectCompare: suggestions.rejectCompare,
        pendingApply: suggestions.pendingApply,
        acceptPendingApply: suggestions.acceptPendingApply,
        rejectPendingApply: suggestions.rejectPendingApply,
        textareaRef,
        updateSelection,
        onInsertChatMessage: insertChatIntoEditor,
        isImproving: suggestions.isGenerating,
        showCustomModelForm: models.showCustomModelForm,
        customModelId: models.customModelId,
        setCustomModelId: models.setCustomModelId,
        customModelName: models.customModelName,
        setCustomModelName: models.setCustomModelName,
        isVerifyingModel: models.isVerifyingModel,
        addCustomModel: models.addCustomModel,
        showApiKeyModal: apiKey.showApiKeyModal,
        maskedApiKey: apiKey.maskedApiKey,
        apiKeyInput: apiKey.apiKeyInput,
        setApiKeyInput: apiKey.setApiKeyInput,
        apiKeyError: apiKey.apiKeyError,
        setApiKeyError: apiKey.setApiKeyError,
        showApiKey: apiKey.showApiKey,
        setShowApiKey: apiKey.setShowApiKey,
        isTestingApiKey: apiKey.isTestingApiKey,
        isUpdatingApiKey: apiKey.isUpdatingApiKey,
        apiKeyTestSuccess: apiKey.apiKeyTestSuccess,
        rememberKey: apiKey.rememberKey,
        setRememberKey: apiKey.setRememberKey,
        showSecurityInfo: apiKey.showSecurityInfo,
        setShowSecurityInfo: apiKey.setShowSecurityInfo,
        copied: apiKey.copied,
        testApiKey: apiKey.testApiKey,
        updateApiKey: apiKey.updateApiKey,
        copyToClipboard: apiKey.copyToClipboard,
        isProd: apiKey.isProd,
        showNotification,
        showToast,
        toastMessage,
        toastType,
        customModelFormRef,
      }}
    />
  );
}
