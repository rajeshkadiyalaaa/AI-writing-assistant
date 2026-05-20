import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { formatApiError, assertApiSuccess } from '../lib/errors';

const IS_PROD = process.env.NODE_ENV === 'production';

export default function useApiKey(showNotification) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [isUpdatingApiKey, setIsUpdatingApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyTestSuccess, setApiKeyTestSuccess] = useState(false);
  const [rememberKey, setRememberKey] = useState(!IS_PROD);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchApiKeyInfo = useCallback(async () => {
    try {
      const response = await api.settingsApikey();
      setMaskedApiKey(response.data.maskedKey);
      setApiKeySet(response.data.isSet);
    } catch {
      setApiKeyError('Failed to load API key information');
    }
  }, []);

  useEffect(() => {
    if (IS_PROD) {
      localStorage.removeItem('openrouter_api_key');
    }
    fetchApiKeyInfo();
    api.health().catch(() => {
      console.warn('Backend not reachable. From project root run: npm start');
    });
  }, [fetchApiKeyInfo]);

  useEffect(() => {
    if (IS_PROD || !rememberKey) return;
    const stored = localStorage.getItem('openrouter_api_key');
    if (stored && !apiKeyInput) {
      setApiKeyInput(stored);
    }
  }, [rememberKey, apiKeyInput]);

  const updateApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyError('API key cannot be empty');
      return;
    }
    setIsUpdatingApiKey(true);
    setApiKeyError('');
    try {
      const cleaned = apiKeyInput.replace(/[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u2000-\u200F\u2028\u2029\u202A-\u202E\u2060-\u206F\uFEFF]/g, '').trim();
      const response = await api.settingsApikey({ apiKey: cleaned });
      assertApiSuccess(response);
      setMaskedApiKey(response.data.maskedKey);
      setApiKeySet(true);
      if (rememberKey && !IS_PROD) {
        localStorage.setItem('openrouter_api_key', cleaned);
      } else {
        localStorage.removeItem('openrouter_api_key');
      }
      setApiKeyInput('');
      setShowApiKey(false);
      setShowApiKeyModal(false);
      showNotification('API key saved on server for this session', 'success');
    } catch (error) {
      const msg =
        (error.status === 403 || error.response?.status === 403) && IS_PROD
          ? 'In production, set OPENROUTER_API_KEY in the server .env file instead of saving here.'
          : formatApiError(error);
      setApiKeyError(msg);
      showNotification(`Failed to update API key: ${msg}`, 'error');
    } finally {
      setIsUpdatingApiKey(false);
    }
  };

  const testApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyError('API key cannot be empty');
      return;
    }
    if (!apiKeyInput.startsWith('sk-or-')) {
      setApiKeyError('Invalid API key format. OpenRouter API keys should start with sk-or-');
      return;
    }
    setIsTestingApiKey(true);
    setApiKeyError('');
    try {
      const cleaned = apiKeyInput.replace(/[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u2000-\u200F\u2028\u2029\u202A-\u202E\u2060-\u206F\uFEFF]/g, '').trim();
      const response = await api.verifyApiKey({ apiKey: cleaned });
      if (response.data.success) {
        setApiKeyTestSuccess(true);
        showNotification('API key is valid!', 'success');
        setTimeout(() => setApiKeyTestSuccess(false), 3000);
      } else {
        setApiKeyError(response.data.error || 'API key validation failed');
        showNotification('API key validation failed', 'error');
      }
    } catch (error) {
      const message = formatApiError(error);
      setApiKeyError(
        error.status === 401 || error.code === 'API_KEY'
          ? 'Invalid or expired API key. Create a new one at openrouter.ai/keys'
          : message
      );
      showNotification(message, 'error');
    } finally {
      setIsTestingApiKey(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const closeApiKeyModal = () => {
    setShowApiKeyModal(false);
    setApiKeyInput('');
    setApiKeyError('');
  };

  return {
    apiKeyInput,
    setApiKeyInput,
    maskedApiKey,
    showApiKey,
    setShowApiKey,
    apiKeySet,
    apiKeyError,
    setApiKeyError,
    showApiKeyModal,
    setShowApiKeyModal,
    isTestingApiKey,
    isUpdatingApiKey,
    apiKeyTestSuccess,
    rememberKey,
    setRememberKey,
    showSecurityInfo,
    setShowSecurityInfo,
    copied,
    testApiKey,
    updateApiKey,
    copyToClipboard,
    closeApiKeyModal,
    isProd: IS_PROD,
  };
}
