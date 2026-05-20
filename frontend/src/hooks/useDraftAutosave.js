import { useState, useEffect, useRef, useCallback } from 'react';

const DRAFT_KEY = 'awa_draft';
const DEBOUNCE_MS = 1000;

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(payload) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...payload, updatedAt: Date.now() }));
  } catch {
    /* quota exceeded — ignore */
  }
}

/**
 * Autosaves editor state to localStorage; offers restore on load.
 */
export default function useDraftAutosave({
  content,
  documentTitle,
  documentType,
  tone,
  model,
  temperature,
}) {
  const [pendingDraft, setPendingDraft] = useState(null);
  const hydrated = useRef(false);
  const skipSave = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const draft = readDraft();
    if (draft?.content?.trim()) {
      setPendingDraft(draft);
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current || skipSave.current) {
      skipSave.current = false;
      return undefined;
    }

    const timer = setTimeout(() => {
      writeDraft({
        content,
        documentTitle,
        documentType,
        tone,
        model,
        temperature,
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [content, documentTitle, documentType, tone, model, temperature]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setPendingDraft(null);
  }, []);

  const restoreDraft = useCallback(
    ({ setContent, setDocumentTitle, setDocumentType, setTone, setModel, setTemperature }) => {
      if (!pendingDraft) return;
      skipSave.current = true;
      setContent(pendingDraft.content || '');
      setDocumentTitle(pendingDraft.documentTitle || 'Untitled Document');
      setDocumentType(pendingDraft.documentType || 'general');
      setTone(pendingDraft.tone || 'professional');
      setModel(pendingDraft.model || model);
      if (pendingDraft.temperature != null) {
        setTemperature(pendingDraft.temperature);
      }
      setPendingDraft(null);
    },
    [pendingDraft, model]
  );

  const dismissDraft = useCallback(() => {
    setPendingDraft(null);
  }, []);

  const formatDraftTime = useCallback(() => {
    if (!pendingDraft?.updatedAt) return '';
    return new Date(pendingDraft.updatedAt).toLocaleString();
  }, [pendingDraft]);

  return {
    pendingDraft,
    restoreDraft,
    dismissDraft,
    clearDraft,
    formatDraftTime,
    skipNextAutosave: () => {
      skipSave.current = true;
    },
  };
};
