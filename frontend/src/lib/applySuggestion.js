/**
 * Parse suggestion text for search/replace pairs and apply to document content.
 */

const ARROW_PATTERN =
  /["“](.+?)["”]\s*(?:→|->|—>)\s*["“](.+?)["”]/i;
const REPLACE_WITH_PATTERN =
  /replace\s+["“](.+?)["”]\s+with\s+["“](.+?)["”]/i;
const CHANGE_TO_PATTERN =
  /change\s+["“](.+?)["”]\s+to\s+["“](.+?)["”]/i;
const FIX_PATTERN =
  /(?:fix|example):\s*["“](.+?)["”]\s*(?:→|->|to)\s*["“](.+?)["”]/i;

export function parseSuggestionText(text) {
  const raw = (text || '').trim();
  const base = { text: raw, search: null, replace: null, summary: raw };

  if (!raw) return base;

  for (const pattern of [ARROW_PATTERN, REPLACE_WITH_PATTERN, CHANGE_TO_PATTERN, FIX_PATTERN]) {
    const m = raw.match(pattern);
    if (m) {
      return {
        text: raw,
        search: m[1].trim(),
        replace: m[2].trim(),
        summary: `Replace “${m[1].trim()}” with “${m[2].trim()}”`,
      };
    }
  }

  return base;
}

export function applySuggestionToContent(content, suggestion) {
  const parsed = suggestion.search != null
    ? suggestion
    : parseSuggestionText(suggestion.text);

  if (parsed.search && parsed.replace != null) {
    const idx = content.indexOf(parsed.search);
    if (idx !== -1) {
      const next = replaceAt(content, idx, parsed.search.length, parsed.replace);
      return {
        ok: true,
        content: next,
        mode: 'replace',
        parsed,
      };
    }
    return {
      ok: false,
      content,
      mode: 'not_found',
      parsed,
      reason: `Could not find “${parsed.search}” in your document.`,
    };
  }

  if (suggestion.originalContent != null) {
    return { ok: true, content: suggestion.originalContent, mode: 'revert', parsed };
  }

  if (suggestion.type === 'alternative') {
    return {
      ok: true,
      content: `${content}\n\n${parsed.text.replace(/^\d+\.\s*/, '')}`,
      mode: 'append',
      parsed,
    };
  }

  return {
    ok: false,
    content,
    mode: 'needs_preview',
    parsed,
    reason: 'No exact phrase to replace. Preview the change before applying.',
  };
}

function replaceAt(content, index, length, replacement) {
  return content.slice(0, index) + replacement + content.slice(index + length);
}
