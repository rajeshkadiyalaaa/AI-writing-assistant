import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { formatApiError, assertApiSuccess } from '../lib/errors';
import {
  FALLBACK_MODELS,
  DEFAULT_MODEL_ID,
  getRecommendedModelId,
  getModelDisplayName,
} from '../constants/models';

const AUTO_MODEL_KEY = 'awa_auto_model';

function loadAutoModelPref() {
  try {
    const v = localStorage.getItem(AUTO_MODEL_KEY);
    if (v === 'false') return false;
    return true;
  } catch {
    return true;
  }
}

export default function useModels({ model, setModel, documentType, showNotification }) {
  const [modelOptions, setModelOptions] = useState(FALLBACK_MODELS);
  const [modelsSource, setModelsSource] = useState('fallback');
  const [autoPickModel, setAutoPickModel] = useState(loadAutoModelPref);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [showCustomModelForm, setShowCustomModelForm] = useState(false);
  const [customModelId, setCustomModelId] = useState('');
  const [customModelName, setCustomModelName] = useState('');
  const [isVerifyingModel, setIsVerifyingModel] = useState(false);
  const prevDocumentType = useRef(documentType);
  const modelsLoaded = useRef(false);

  const switchToRecommended = (reason, options = modelOptions) => {
    const recommended = getRecommendedModelId(documentType, options);
    const current = options.find((m) => m.id === model);
    if (recommended === model) return;
    if (current?.custom) return;

    const name = getModelDisplayName(recommended, options);
    setModel(recommended);
    if (reason === 'documentType' && showNotification) {
      const typeLabel = documentType.charAt(0).toUpperCase() + documentType.slice(1);
      showNotification(`Using ${name} for ${typeLabel} writing`, 'info');
    }
  };

  useEffect(() => {
    api.models()
      .then((res) => {
        const builtIn = res.data.models || FALLBACK_MODELS;
        const custom = JSON.parse(localStorage.getItem('custom_models') || '[]');
        const merged = [...builtIn, ...custom];
        setModelsSource(res.data.source || 'openrouter');
        setModelOptions(merged);
        modelsLoaded.current = true;

        const ids = new Set(merged.map((m) => m.id));
        setModel((current) => {
          if (!ids.has(current)) {
            return res.data.default_model || builtIn[0]?.id || DEFAULT_MODEL_ID;
          }
          const staleDefaults = [
            'google/gemma-4-27b-it:free',
            'openai/gpt-4o',
            'openai/gpt-4o-mini',
          ];
          if (staleDefaults.includes(current)) {
            return getRecommendedModelId(documentType, merged);
          }
          if (current === DEFAULT_MODEL_ID && res.data.default_model) {
            return res.data.default_model;
          }
          return current;
        });
      })
      .catch((err) => {
        const custom = JSON.parse(localStorage.getItem('custom_models') || '[]');
        setModelOptions([...FALLBACK_MODELS, ...custom]);
        setModelsSource('fallback');
        modelsLoaded.current = true;
        showNotification?.(`Using offline models — ${formatApiError(err)}`, 'warning');
      });
  }, [setModel, documentType]);

  useEffect(() => {
    if (!autoPickModel || !modelsLoaded.current) {
      prevDocumentType.current = documentType;
      return;
    }

    const builtIn = modelOptions.filter((m) => !m.custom);
    if (builtIn.length === 0) return;

    const docTypeChanged = prevDocumentType.current !== documentType;
    prevDocumentType.current = documentType;

    const current = modelOptions.find((m) => m.id === model);
    const needsSwitch = current && !current.custom && !current.strengths?.includes(documentType);

    if (docTypeChanged && needsSwitch) {
      switchToRecommended('documentType');
    } else if (needsSwitch && !docTypeChanged) {
      switchToRecommended('silent');
    }
  }, [documentType, modelOptions, model, autoPickModel, setModel, showNotification]);

  const setAutoPickModelPref = (enabled) => {
    setAutoPickModel(enabled);
    localStorage.setItem(AUTO_MODEL_KEY, String(enabled));
    if (enabled) {
      switchToRecommended('documentType');
      showNotification('Auto model pick enabled', 'info');
    } else {
      showNotification('Auto model pick disabled — your model stays as selected', 'info');
    }
  };

  const refreshModels = async () => {
    setIsRefreshingModels(true);
    try {
      const res = await api.refreshModels({ slot: documentType });
      const builtIn = res.data.models || FALLBACK_MODELS;
      const custom = JSON.parse(localStorage.getItem('custom_models') || '[]');
      const merged = [...builtIn, ...custom];
      setModelOptions(merged);
      setModelsSource(res.data.source || 'openrouter');
      showNotification(
        res.data.source === 'openrouter'
          ? 'Free models list updated from OpenRouter'
          : 'Could not reach OpenRouter — using fallback list',
        res.data.source === 'openrouter' ? 'success' : 'warning'
      );
      if (autoPickModel) {
        const recommended = getRecommendedModelId(documentType, merged);
        setModel(recommended);
      }
    } catch (error) {
      showNotification(`Refresh failed: ${formatApiError(error)}`, 'error');
    } finally {
      setIsRefreshingModels(false);
    }
  };

  const addCustomModel = async () => {
    if (!customModelId.trim() || !customModelName.trim()) {
      showNotification('Model ID and display name are required', 'error');
      return;
    }
    setIsVerifyingModel(true);
    try {
      const response = await api.verifyModel({ model: customModelId });
      assertApiSuccess(response);

      const newModel = {
        id: customModelId,
        name: customModelName,
        strengths: ['general'],
        description: 'Custom model',
        free: false,
        custom: true,
      };
      setModelOptions((prev) => [...prev, newModel]);
      setModel(customModelId);
      setShowCustomModelForm(false);
      setCustomModelId('');
      setCustomModelName('');

      if (window.confirm(`Verified "${customModelName}". Save for future sessions?`)) {
        const saved = JSON.parse(localStorage.getItem('custom_models') || '[]');
        localStorage.setItem('custom_models', JSON.stringify([...saved, newModel]));
        showNotification(`Model "${customModelName}" saved`, 'success');
      }
    } catch (error) {
      showNotification(`Model verification failed: ${formatApiError(error)}`, 'error');
    } finally {
      setIsVerifyingModel(false);
    }
  };

  const removeCustomModel = (modelId) => {
    const toRemove = modelOptions.find((m) => m.id === modelId);
    if (!toRemove?.custom) {
      showNotification('Only custom models can be removed', 'error');
      return;
    }
    if (!window.confirm(`Remove model "${toRemove.name}"?`)) return;
    const next = modelOptions.filter((m) => m.id !== modelId);
    setModelOptions(next);
    const saved = JSON.parse(localStorage.getItem('custom_models') || '[]');
    localStorage.setItem('custom_models', JSON.stringify(saved.filter((m) => m.id !== modelId)));
    if (model === modelId && next.length > 0) {
      setModel(next[0].id);
    }
    showNotification(`Removed "${toRemove.name}"`, 'info');
  };

  return {
    modelOptions,
    modelsSource,
    autoPickModel,
    setAutoPickModelPref,
    refreshModels,
    isRefreshingModels,
    showCustomModelForm,
    setShowCustomModelForm,
    customModelId,
    setCustomModelId,
    customModelName,
    setCustomModelName,
    isVerifyingModel,
    addCustomModel,
    removeCustomModel,
  };
};
