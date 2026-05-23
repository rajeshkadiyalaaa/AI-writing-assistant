/** User-facing OpenRouter messages (keep in sync with backend/scripts/openrouter_errors.py). */

const MESSAGES = {
  RATE_LIMIT:
    'Rate limited by OpenRouter. Wait a minute, then try again — or switch to another model in Style.',
  API_KEY: 'Invalid or missing OpenRouter API key. Check Settings → API key.',
  MODEL_UNAVAILABLE:
    'That free model is unavailable. Refresh models in Style or pick another model.',
  EMPTY_RESPONSE:
    'The model returned no text. Try again or choose a different model in Style.',
};

function messageForCode(code, { retryAfterSec } = {}) {
  if (code === 'RATE_LIMIT') {
    const base = MESSAGES.RATE_LIMIT;
    if (retryAfterSec && retryAfterSec > 0) {
      return `${base} (wait about ${retryAfterSec}s)`;
    }
    return base;
  }
  return MESSAGES[code] || 'OpenRouter request failed. Try again or pick another model in Style.';
}

function parseRetryAfterSeconds(headers) {
  if (!headers) return 0;
  const raw = headers.get?.('retry-after') || headers['retry-after'];
  if (!raw) return 0;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return Math.min(Math.ceil(n), 120);
  return 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  MESSAGES,
  messageForCode,
  parseRetryAfterSeconds,
  sleep,
};
