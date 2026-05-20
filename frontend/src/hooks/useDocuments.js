import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'awa_saved_documents';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function useDocuments({
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
  setSuggestions,
  setActiveTab,
  addHistory,
  showNotification,
  clearDraft,
  resetEditorHistory,
  skipNextAutosave,
}) {
  const [savedDocuments, setSavedDocuments] = useState(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDocuments));
  }, [savedDocuments]);

  const isCurrentSaved = useCallback(
    () =>
      savedDocuments.some(
        (doc) =>
          doc.title === documentTitle &&
          doc.content === content &&
          (doc.type || 'general') === documentType &&
          (doc.tone || 'professional') === tone &&
          (doc.model || '') === model
      ),
    [savedDocuments, documentTitle, content, documentType, tone, model]
  );

  const applyDocument = useCallback(
    (doc) => {
      skipNextAutosave?.();
      setDocumentTitle(doc.title);
      setContent(doc.content || '');
      setDocumentType(doc.type || 'general');
      setTone(doc.tone || 'professional');
      if (doc.model) setModel(doc.model);
      if (doc.temperature != null) setTemperature(doc.temperature);
      setSuggestions([]);
      setActiveTab('editor');
    },
    [
      setContent,
      setDocumentTitle,
      setDocumentType,
      setTone,
      setModel,
      setTemperature,
      setSuggestions,
      setActiveTab,
      skipNextAutosave,
    ]
  );

  const createNewDocument = () => {
    if (content.trim() && !isCurrentSaved()) {
      if (!window.confirm('You have unsaved changes. Create a new document anyway?')) return;
    }
    skipNextAutosave?.();
    setDocumentTitle('Untitled Document');
    setContent('');
    setDocumentType('general');
    setTone('professional');
    setSuggestions([]);
    setActiveTab('editor');
    clearDraft?.();
    resetEditorHistory?.();
    addHistory('Created new document');
  };

  const saveDocument = () => {
    if (!content.trim()) {
      showNotification('Cannot save an empty document', 'error');
      return;
    }
    const existingIndex = savedDocuments.findIndex((doc) => doc.title === documentTitle);
    const date = new Date().toISOString().split('T')[0];
    const record = {
      title: documentTitle,
      content,
      date,
      type: documentType,
      tone,
      model,
      temperature,
    };

    if (existingIndex >= 0) {
      const updated = [...savedDocuments];
      updated[existingIndex] = { ...updated[existingIndex], ...record };
      setSavedDocuments(updated);
      showNotification(`"${documentTitle}" updated`, 'success');
    } else {
      setSavedDocuments([...savedDocuments, { id: Date.now(), ...record }]);
      showNotification(`"${documentTitle}" saved`, 'success');
    }
    addHistory(`Saved document "${documentTitle}"`);
  };

  const loadDocument = (id) => {
    const doc = savedDocuments.find((d) => d.id === id);
    if (!doc) return;
    if (content.trim() && !isCurrentSaved()) {
      if (!window.confirm('Discard unsaved changes and open this document?')) return;
    }
    applyDocument(doc);
    clearDraft?.();
    resetEditorHistory?.();
    addHistory(`Opened "${doc.title}"`);
    showNotification(`Opened "${doc.title}"`, 'info');
  };

  const deleteDocument = (id) => {
    const doc = savedDocuments.find((d) => d.id === id);
    if (!doc || !window.confirm(`Delete "${doc.title}"?`)) return;
    setSavedDocuments(savedDocuments.filter((d) => d.id !== id));
    showNotification(`Deleted "${doc.title}"`, 'info');
    addHistory(`Deleted "${doc.title}"`);
  };

  return {
    savedDocuments,
    createNewDocument,
    saveDocument,
    loadDocument,
    deleteDocument,
  };
}
