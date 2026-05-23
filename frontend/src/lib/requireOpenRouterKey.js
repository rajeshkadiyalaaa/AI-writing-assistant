import { isCustomModel } from '../constants/models';

/**
 * Returns true when the app may call OpenRouter for the current model.
 * Opens the API key modal when a key is required but missing.
 */
export function requireOpenRouterKey({
  apiKeySet,
  model,
  modelOptions,
  setShowApiKeyModal,
  showNotification,
  requireForAllModels = false,
}) {
  if (apiKeySet) return true;

  const needsKey = requireForAllModels || isCustomModel(model, modelOptions);
  if (!needsKey) return true;

  showNotification?.(
    requireForAllModels
      ? 'Connect your OpenRouter API key first'
      : 'Custom models require your OpenRouter API key. Connect it in Settings.',
    'warning'
  );
  setShowApiKeyModal?.(true);
  return false;
}
