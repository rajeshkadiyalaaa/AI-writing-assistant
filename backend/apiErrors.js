/**
 * Consistent JSON error responses for Express routes.
 */

function sendError(res, status, message, extras = {}) {
  return res.status(status).json({
    error: message,
    ...extras,
  });
}

function mapErrorStatus(message = '', details = '') {
  const text = `${message} ${details}`.toLowerCase();
  if (
    text.includes('api key') ||
    text.includes('authentication') ||
    text.includes('401') ||
    text.includes('unauthorized')
  ) {
    return 401;
  }
  if (text.includes('rate limit') || text.includes('429') || text.includes('too many')) {
    return 429;
  }
  if (
    text.includes('not a valid model') ||
    (text.includes('model') && text.includes('not found')) ||
    text.includes('404')
  ) {
    return 400;
  }
  if (text.includes('no content') || text.includes('cannot be empty') || text.includes('required')) {
    return 400;
  }
  if (text.includes('python') || text.includes('enoent')) {
    return 503;
  }
  return 502;
}

function statusForPythonPayload(payload) {
  if (!payload?.error) return null;
  return mapErrorStatus(payload.error, payload.details || '');
}

function handleRouteError(res, error, fallbackMessage = 'Request failed') {
  const message = error?.message || fallbackMessage;
  // Never forward Python stderr to clients (paths, verbose provider bodies, accidental secrets).
  const details =
    typeof error?.details === 'string' && error.details.trim()
      ? error.details
      : '';
  const status = error?.status || mapErrorStatus(message, details);
  if (error?.stderr) {
    console.error(`[API ${status}]`, message, '— stderr (server only):', String(error.stderr).slice(0, 500));
  } else {
    console.error(`[API ${status}]`, message, details ? `— ${details}` : '');
  }
  return sendError(res, status, message, details ? { details } : {});
}

function requireServerApiKey(req, res) {
  // 1. Prefer the user's personal API key passed from localStorage
  const userKey = req.headers['x-user-api-key'];
  if (userKey && String(userKey).trim()) {
    return String(userKey).trim();
  }

  // 2. Protect server billing: Only allow free models on the server's master API key
  const requestedModel = req.body?.model;
  const isFreeModel = !requestedModel || 
                      requestedModel === 'openrouter/free' || 
                      String(requestedModel).endsWith(':free');

  if (!isFreeModel) {
    sendError(res, 403, 'You must provide your own API key in Settings to use premium custom models.', {
      code: 'API_KEY_REQUIRED',
    });
    return null;
  }

  // 3. Fallback to server's master key for free tier usage
  const key = process.env.OPENROUTER_API_KEY;
  if (key && String(key).trim()) return key;

  sendError(res, 503, 'OPENROUTER_API_KEY not configured on the server.', {
    code: 'API_KEY_MISSING',
  });
  return null;
}

module.exports = {
  sendError,
  mapErrorStatus,
  statusForPythonPayload,
  handleRouteError,
  requireServerApiKey,
};
