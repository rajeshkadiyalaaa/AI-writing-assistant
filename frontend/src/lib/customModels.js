const STORAGE_KEY = 'custom_models';

export function loadCustomModels() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomModels(models) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
}

export function mergeWithCustomModels(builtIn = []) {
  return [...builtIn, ...loadCustomModels()];
}
