/** Normalize OpenRouter usage payloads for the UI */

export const EMPTY_USAGE = {
  total: { prompt: 0, completion: 0, total: 0 },
  last: { prompt: 0, completion: 0, total: 0 },
};

export function normalizeUsage(usage) {
  if (!usage) return null;
  const prompt = usage.prompt_tokens ?? usage.prompt ?? 0;
  const completion = usage.completion_tokens ?? usage.completion ?? 0;
  const total = usage.total_tokens ?? usage.total ?? prompt + completion;
  return { prompt, completion, total };
}

export function mergeUsage(prev, usage) {
  const n = normalizeUsage(usage);
  if (!n) return prev;
  return {
    total: {
      prompt: prev.total.prompt + n.prompt,
      completion: prev.total.completion + n.completion,
      total: prev.total.total + n.total,
    },
    last: n,
  };
}

/** Fallback estimate when API does not return usage */
export function estimateUsageFromText(messageCount, responseText) {
  const words = responseText?.split(/\s+/).filter(Boolean).length || 0;
  const completion = Math.ceil(words * 1.3);
  const prompt = messageCount * 50;
  return { prompt, completion, total: prompt + completion };
}
