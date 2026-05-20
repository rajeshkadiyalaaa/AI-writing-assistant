/**
 * Strip invisible Unicode and whitespace from OpenRouter API keys.
 * Pasted keys often include U+2028/U+2029 line separators that break HTTP headers.
 */
function sanitizeApiKey(raw) {
  if (raw == null || typeof raw !== 'string') return '';
  return raw
    .replace(
      /[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u2000-\u200F\u200B-\u200D\u2028\u2029\u202A-\u202E\u2060-\u206F\uFEFF]/g,
      ''
    )
    .trim();
}

function isValidOpenRouterKey(key) {
  return typeof key === 'string' && /^sk-or-[a-zA-Z0-9_-]+$/.test(key);
}

module.exports = { sanitizeApiKey, isValidOpenRouterKey };
