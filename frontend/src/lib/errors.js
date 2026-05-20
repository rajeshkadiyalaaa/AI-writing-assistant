/**
 * Normalized app errors for API, streaming, and UI messaging.
 */

function apiBaseLabel() {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (process.env.NODE_ENV === 'development') return 'proxy → port 5001';
  return typeof window !== 'undefined' ? window.location.origin : 'API';
}

export const ERROR_CODES = {
  CANCELLED: 'CANCELLED',
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  API_KEY: 'API_KEY',
  RATE_LIMIT: 'RATE_LIMIT',
  MODEL: 'MODEL',
  VALIDATION: 'VALIDATION',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN',
};

export function createAppError({ message, code = ERROR_CODES.UNKNOWN, status, details, cancelled }) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  err.details = details;
  err.cancelled = Boolean(cancelled);
  return err;
}

function inferCode(message, status) {
  const m = (message || '').toLowerCase();
  if (m.includes('cancel')) return ERROR_CODES.CANCELLED;
  if (status === 401 || m.includes('api key') || m.includes('authentication')) return ERROR_CODES.API_KEY;
  if (status === 429 || m.includes('rate limit')) return ERROR_CODES.RATE_LIMIT;
  if (status === 400 && m.includes('model')) return ERROR_CODES.MODEL;
  if (status === 400 || m.includes('required') || m.includes('empty')) return ERROR_CODES.VALIDATION;
  if (status === 503 || m.includes('python')) return ERROR_CODES.SERVER;
  if (status >= 500) return ERROR_CODES.SERVER;
  return ERROR_CODES.UNKNOWN;
}

function friendlyMessage(code, rawMessage) {
  switch (code) {
    case ERROR_CODES.CANCELLED:
      return 'Request cancelled';
    case ERROR_CODES.NETWORK:
      return `Cannot reach the backend. From the project root run: npm start (${apiBaseLabel()})`;
    case ERROR_CODES.TIMEOUT:
      return 'Request timed out. Try again or use a faster model.';
    case ERROR_CODES.API_KEY:
      return rawMessage?.includes('sk-or')
        ? rawMessage
        : 'Invalid or missing OpenRouter API key. Update it in Settings → API key.';
    case ERROR_CODES.RATE_LIMIT:
      return 'Rate limit reached. Wait a moment and try again.';
    case ERROR_CODES.MODEL:
      return rawMessage || 'That model is unavailable. Pick another in Style settings or refresh free models.';
    case ERROR_CODES.VALIDATION:
      return rawMessage || 'Invalid input. Check your draft and try again.';
    case ERROR_CODES.SERVER:
      return rawMessage || 'Server error. Check the terminal logs and your API key.';
    default:
      return rawMessage || 'Something went wrong. Please try again.';
  }
}

/** Turn axios / fetch / thrown errors into a consistent Error shape */
export function normalizeError(error) {
  if (!error) {
    return createAppError({ message: 'Unknown error', code: ERROR_CODES.UNKNOWN });
  }

  if (error.cancelled || error.code === ERROR_CODES.CANCELLED) {
    return createAppError({
      message: friendlyMessage(ERROR_CODES.CANCELLED),
      code: ERROR_CODES.CANCELLED,
      cancelled: true,
    });
  }

  if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
    return createAppError({
      message: friendlyMessage(ERROR_CODES.CANCELLED),
      code: ERROR_CODES.CANCELLED,
      cancelled: true,
    });
  }

  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return createAppError({
      message: friendlyMessage(ERROR_CODES.TIMEOUT),
      code: ERROR_CODES.TIMEOUT,
      status: error.response?.status,
    });
  }

  if (error.code && ERROR_CODES[error.code]) {
    return error;
  }

  const status = error.response?.status ?? error.status;
  const data = error.response?.data;
  const raw =
    (typeof data?.error === 'string' ? data.error : null) ||
    data?.message ||
    error.message ||
    'Request failed';
  const details = typeof data?.details === 'string' ? data.details : error.details;
  const code = data?.code && ERROR_CODES[data.code] ? data.code : inferCode(raw, status);

  if (!error.response && !error.status) {
    return createAppError({
      message: friendlyMessage(ERROR_CODES.NETWORK, raw),
      code: ERROR_CODES.NETWORK,
      details: raw,
    });
  }

  return createAppError({
    message: friendlyMessage(code, raw),
    code,
    status,
    details,
  });
}

export function formatApiError(error) {
  if (!error) return 'Something went wrong';
  if (typeof error === 'string') return error;
  const normalized = error.code ? error : normalizeError(error);
  if (normalized.details && normalized.code === ERROR_CODES.SERVER) {
    return `${normalized.message}${normalized.details ? ` (${normalized.details.slice(0, 120)})` : ''}`;
  }
  return normalized.message;
}

/** Throw if API JSON body includes an error field */
export function assertApiSuccess(response, fallbackLabel = 'Request') {
  const data = response?.data;
  if (data?.error) {
    throw createAppError({
      message: data.error,
      code: inferCode(data.error, response.status),
      status: response.status,
      details: data.details,
    });
  }
  if (data?.success === false && data?.error) {
    throw createAppError({
      message: data.error,
      code: inferCode(data.error, response.status),
      status: response.status,
      details: data.details,
    });
  }
  return data;
}

export function isCancelledError(error) {
  return Boolean(
    error?.cancelled ||
    error?.code === ERROR_CODES.CANCELLED ||
    error?.name === 'AbortError' ||
    error?.code === 'ERR_CANCELED'
  );
}
