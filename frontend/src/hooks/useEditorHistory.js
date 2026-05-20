import { useState, useCallback, useRef } from 'react';

const MAX_STACK = 25;

function captureState(fields) {
  return {
    content: fields.content,
    documentTitle: fields.documentTitle,
    documentType: fields.documentType,
    tone: fields.tone,
    model: fields.model,
    temperature: fields.temperature,
  };
}

/**
 * Undo/redo stack and labeled versions for the History sidebar.
 */
export default function useEditorHistory({
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
}) {
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [versions, setVersions] = useState([]);
  const applying = useRef(false);

  const getCurrent = useCallback(
    () => captureState({ content, documentTitle, documentType, tone, model, temperature }),
    [content, documentTitle, documentType, tone, model, temperature]
  );

  const applyState = useCallback(
    (snap) => {
      applying.current = true;
      setContent(snap.content ?? '');
      setDocumentTitle(snap.documentTitle ?? 'Untitled Document');
      setDocumentType(snap.documentType ?? 'general');
      setTone(snap.tone ?? 'professional');
      setModel(snap.model ?? model);
      setTemperature(snap.temperature ?? 0.7);
      requestAnimationFrame(() => {
        applying.current = false;
      });
    },
    [setContent, setDocumentTitle, setDocumentType, setTone, setModel, setTemperature, model]
  );

  const pushSnapshot = useCallback(
    (label = 'Edit') => {
      if (applying.current) return;
      const snap = { ...getCurrent(), label, id: Date.now() };
      setPast((prev) => [...prev.slice(-(MAX_STACK - 1)), snap]);
      setFuture([]);
      setVersions((prev) => [
        ...prev.slice(-(MAX_STACK - 1)),
        { id: snap.id, label, timestamp: new Date().toLocaleTimeString(), snap },
      ]);
    },
    [getCurrent]
  );

  const undo = useCallback(() => {
    if (past.length === 0) return false;
    const previous = past[past.length - 1];
    const current = getCurrent();
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [current, ...f]);
    applyState(previous);
    return true;
  }, [past, getCurrent, applyState]);

  const redo = useCallback(() => {
    if (future.length === 0) return false;
    const next = future[0];
    const current = getCurrent();
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, current]);
    applyState(next);
    return true;
  }, [future, getCurrent, applyState]);

  const restoreVersion = useCallback(
    (versionId) => {
      const entry = versions.find((v) => v.id === versionId);
      if (!entry?.snap) return false;
      pushSnapshot('Before version restore');
      applyState(entry.snap);
      return true;
    },
    [versions, pushSnapshot, applyState]
  );

  const resetHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
    setVersions([]);
  }, []);

  return {
    pushSnapshot,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    versions,
    restoreVersion,
    resetHistory,
  };
};
