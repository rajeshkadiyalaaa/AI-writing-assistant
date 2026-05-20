import { getApiUrl } from '../api';
import { createAppError, ERROR_CODES, normalizeError } from './errors';

/**
 * Stream chat from /api/generate/stream (OpenRouter SSE proxy).
 */
export async function streamChatGenerate(payload, { signal, onChunk, onUsage, onError }) {
  const base = getApiUrl();
  let res;
  try {
    res = await fetch(`${base}/api/generate/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    const normalized = normalizeError(err);
    onError?.(normalized);
    throw normalized;
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code;
    try {
      const errJson = await res.json();
      message = errJson.error || message;
      code = errJson.code;
    } catch {
      /* ignore */
    }
    const err = createAppError({
      message,
      code: code || (res.status === 401 ? ERROR_CODES.API_KEY : ERROR_CODES.SERVER),
      status: res.status,
    });
    onError?.(err);
    throw err;
  }

  if (!res.body) {
    const err = createAppError({
      message: 'Streaming not supported in this browser',
      code: ERROR_CODES.SERVER,
    });
    onError?.(err);
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const apiErr = parsed.error?.message || parsed.error;
          if (apiErr) {
            const err = createAppError({
              message: typeof apiErr === 'string' ? apiErr : 'Stream error from model',
              code: ERROR_CODES.SERVER,
            });
            onError?.(err);
            throw err;
          }
          if (parsed.usage) {
            onUsage?.(parsed.usage);
          }
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk?.(fullText, delta);
          }
        } catch (e) {
          if (e.code && ERROR_CODES[e.code]) throw e;
          if (e.message && !e.message.includes('JSON')) throw e;
        }
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      const cancelErr = createAppError({
        message: 'Request cancelled',
        code: ERROR_CODES.CANCELLED,
        cancelled: true,
      });
      throw cancelErr;
    }
    throw normalizeError(err);
  }

  return fullText;
}
