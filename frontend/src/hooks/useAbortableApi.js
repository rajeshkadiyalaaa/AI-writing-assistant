import { useRef, useState, useCallback } from 'react';
import { normalizeError, isCancelledError } from '../lib/errors';

const SLOW_MS = 10000;

/**
 * Wraps async API calls with AbortController, slow warning, and retry.
 */
export default function useAbortableApi() {
  const controllerRef = useRef(null);
  const slowTimerRef = useRef(null);
  const lastRunnerRef = useRef(null);
  const [isSlow, setIsSlow] = useState(false);
  const [lastError, setLastError] = useState(null);

  const clearSlowTimer = () => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    setIsSlow(false);
  };

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    clearSlowTimer();
  }, []);

  const run = useCallback(async (runner) => {
    cancel();
    const controller = new AbortController();
    controllerRef.current = controller;
    lastRunnerRef.current = runner;
    setLastError(null);
    clearSlowTimer();
    slowTimerRef.current = setTimeout(() => setIsSlow(true), SLOW_MS);

    try {
      const result = await runner(controller.signal);
      return result;
    } catch (err) {
      const normalized = normalizeError(err);
      if (isCancelledError(normalized)) {
        throw normalized;
      }
      setLastError(normalized);
      throw normalized;
    } finally {
      clearSlowTimer();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, [cancel]);

  const retry = useCallback(async () => {
    if (!lastRunnerRef.current) return null;
    setLastError(null);
    return run(lastRunnerRef.current);
  }, [run]);

  const clearError = useCallback(() => setLastError(null), []);

  return {
    run,
    cancel,
    retry,
    isSlow,
    lastError,
    clearError,
    canRetry: Boolean(lastRunnerRef.current && lastError),
  };
}
