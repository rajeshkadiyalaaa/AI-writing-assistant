/** Fallback when /api/models is unreachable */
export const FALLBACK_MODELS = [
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Router',
    strengths: ['general', 'creative'],
    description: 'Auto-picks a free model on OpenRouter',
    free: true,
    task: 'general',
  },
];

export const DEFAULT_MODEL_ID = 'openrouter/free';

const TASK_LABELS = {
  general: 'General & creative',
  business: 'Email & business',
  academic: 'Academic & research',
};

export function getTaskLabel(task) {
  return Object.prototype.hasOwnProperty.call(TASK_LABELS, task) ? TASK_LABELS[task] : 'Writing';
}

export function getModelDisplayName(modelId, modelOptions) {
  const m = modelOptions.find((x) => x.id === modelId);
  return m ? m.name : modelId;
}

export function isRecommendedModel(modelId, documentType, modelOptions) {
  return modelOptions.some((m) => m.id === modelId && m.strengths?.includes(documentType));
}

/** Best free model for the current document type (from the 3 task slots). */
export function getRecommendedModelId(documentType, modelOptions) {
  const builtIn = modelOptions.filter((m) => !m.custom);
  const match = builtIn.find((m) => m.strengths?.includes(documentType));
  return match?.id || builtIn[0]?.id || DEFAULT_MODEL_ID;
}

export function estimateCost(tokens, modelId, modelOptions = FALLBACK_MODELS) {
  const m = modelOptions.find((x) => x.id === modelId);
  return m?.free ? 0 : tokens * 0.000002;
}
