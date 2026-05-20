/**
 * Validate OpenRouter model IDs before proxying to Python or OpenRouter.
 * Prevents path/control characters; allows provider slugs and :free suffixes.
 */
const MODEL_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,127}$/;

function isValidOpenRouterModelId(id) {
  if (id == null || typeof id !== 'string') return false;
  const s = id.trim();
  if (!s || s.length > 128) return false;
  if (!MODEL_ID_RE.test(s)) return false;
  if (s.includes('..') || s.includes('//') || s.includes('<') || s.includes('>')) return false;
  return true;
}

/** @returns {string} normalized id or default */
function normalizeModelId(model, fallback) {
  const fb = fallback || 'openrouter/free';
  if (model == null || model === '') return fb;
  const s = String(model).trim();
  return isValidOpenRouterModelId(s) ? s : fb;
}

module.exports = { isValidOpenRouterModelId, normalizeModelId };
