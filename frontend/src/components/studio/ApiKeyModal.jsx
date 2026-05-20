import React from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Check, AlertCircle, Loader, Shield, Info } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function ApiKeyModal({
  open,
  apiKeySet,
  apiKeyInput,
  setApiKeyInput,
  apiKeyError,
  setApiKeyError,
  showApiKey,
  setShowApiKey,
  isTestingApiKey,
  isUpdatingApiKey,
  apiKeyTestSuccess,
  rememberKey,
  setRememberKey,
  showSecurityInfo,
  setShowSecurityInfo,
  onClose,
  onTest,
  onSave,
  isProd = false,
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="studio-panel relative z-10 w-full max-w-lg animate-slide-up p-6 sm:p-8" role="dialog" aria-modal="true">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {apiKeySet ? 'Update API key' : 'Connect OpenRouter'}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Your key powers AI writing, chat, and suggestions.
          </p>
        </div>

        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          API key
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="ml-2 text-accent hover:underline">
            Get a key →
          </a>
        </label>
        <div className="relative mb-3">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKeyInput}
            onChange={(e) => {
              setApiKeyInput(e.target.value);
              if (apiKeyError) setApiKeyError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && apiKeyInput.trim()) onSave();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="sk-or-..."
            className={cn(
              'studio-input pr-20 font-mono',
              apiKeyInput && !apiKeyInput.startsWith('sk-or-') && 'border-red-300 focus:border-red-400 focus:ring-red-200',
              apiKeyInput.startsWith('sk-or-') && 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-200'
            )}
            autoComplete="off"
            autoFocus
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {apiKeyInput && (
              apiKeyInput.startsWith('sk-or-')
                ? <Check size={18} className="text-emerald-500" />
                : <AlertCircle size={18} className="text-red-500" />
            )}
            <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="btn-icon h-8 w-8">
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {apiKeyError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{apiKeyError}</p>}

        <button
          type="button"
          onClick={onTest}
          disabled={isTestingApiKey || !apiKeyInput.trim() || !apiKeyInput.startsWith('sk-or-')}
          className={cn('btn-secondary mb-4 w-full sm:w-auto', apiKeyTestSuccess && 'border-emerald-300 text-emerald-700 dark:text-emerald-400')}
        >
          {isTestingApiKey ? <Loader size={16} className="animate-spin" /> : apiKeyTestSuccess ? <Check size={16} /> : <Shield size={16} />}
          {apiKeyTestSuccess ? 'Verified' : 'Test connection'}
        </button>

        <div className="mb-5 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
          <div className="flex gap-2">
            <Info size={16} className="mt-0.5 shrink-0" />
            <p>
              {isProd
                ? 'Keys are stored on the server process only (set OPENROUTER_API_KEY in .env for persistence across restarts).'
                : 'For local dev, the key is sent to your backend. Optional browser storage is for convenience only.'}
            </p>
          </div>
        </div>

        {!isProd && (
          <>
            <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input type="checkbox" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} className="rounded border-zinc-300 text-accent focus:ring-accent" />
              Remember in browser (dev only)
              <button type="button" onClick={() => setShowSecurityInfo(!showSecurityInfo)} className="btn-icon h-7 w-7">
                <Info size={14} />
              </button>
            </label>
            {rememberKey && (
              <p className="mb-3 text-xs text-amber-800 dark:text-amber-200/90">
                The key is stored in browser localStorage as plain text — anyone with access to this device can read it. Do not use on shared computers.
              </p>
            )}
            {showSecurityInfo && (
              <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                Not recommended for shared machines. Production should use server .env only.
              </p>
            )}
          </>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={onSave}
            disabled={isUpdatingApiKey || !apiKeyInput.trim() || !apiKeyInput.startsWith('sk-or-')}
            className="btn-primary"
          >
            {isUpdatingApiKey ? <><Loader size={16} className="animate-spin" /> Saving…</> : 'Save API key'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
