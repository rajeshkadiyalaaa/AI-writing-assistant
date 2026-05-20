/** Text selection and range helpers for the editor */

export function replaceTextRange(content, start, end, replacement) {
  const s = Math.max(0, Math.min(start, content.length));
  const e = Math.max(s, Math.min(end, content.length));
  return content.slice(0, s) + replacement + content.slice(e);
}

export function getEmptySelection() {
  return { start: 0, end: 0, text: '' };
}

export function readTextareaSelection(textarea, content) {
  if (!textarea) return getEmptySelection();
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  return {
    start,
    end,
    text: content.slice(start, end),
  };
}

/** Insert text at caret (collapsed selection start). */
export function insertAtCursor(content, cursorPos, text) {
  const pos = Math.max(0, Math.min(cursorPos, content.length));
  return {
    content: content.slice(0, pos) + text + content.slice(pos),
    cursor: pos + text.length,
  };
}

/** Append block with paragraph break when document is non-empty. */
export function appendToDocument(content, text) {
  const trimmed = text.trim();
  if (!trimmed) return { content, cursor: content.length };
  if (!content.trim()) return { content: trimmed, cursor: trimmed.length };
  const next = `${content.trimEnd()}\n\n${trimmed}`;
  return { content: next, cursor: next.length };
}
