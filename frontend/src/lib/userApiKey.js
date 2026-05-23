const STORAGE_KEY = 'openrouter_api_key';

/** Strip invisible characters OpenRouter rejects (same rules as useApiKey). */
export function cleanApiKey(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    // Strip control/invisible chars OpenRouter rejects (same rules as backend sanitizeKey).
    // eslint-disable-next-line no-control-regex -- intentional
    .replace(/[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u2000-\u200F\u2028\u2029\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
    .trim();
}

/** Key typed in the modal or remembered in localStorage (dev). */
export function getStoredUserApiKey() {
  try {
    return cleanApiKey(localStorage.getItem(STORAGE_KEY) || '');
  } catch {
    return '';
  }
}

/** Prefer in-memory input, then stored key. */
export function getEffectiveUserApiKey(apiKeyInput = '') {
  const fromInput = cleanApiKey(apiKeyInput);
  if (fromInput) return fromInput;
  return getStoredUserApiKey();
}
