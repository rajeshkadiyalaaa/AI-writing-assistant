import React from 'react';
import { Loader } from 'lucide-react';

export default function CustomModelModal({
  open,
  customModelId,
  setCustomModelId,
  customModelName,
  setCustomModelName,
  isVerifyingModel,
  onClose,
  onAdd,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="studio-panel relative z-10 w-full max-w-md animate-slide-up p-6">
        <h2 className="font-display text-xl font-semibold text-zinc-900">Add custom model</h2>
        <p className="mt-1 mb-5 text-sm text-zinc-500">Use any model ID from OpenRouter.</p>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">Model ID</span>
          <input
            type="text"
            value={customModelId}
            onChange={(e) => setCustomModelId(e.target.value)}
            placeholder="anthropic/claude-3-haiku"
            className="studio-input font-mono text-sm"
          />
        </label>

        <label className="mb-6 block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">Display name</span>
          <input
            type="text"
            value={customModelName}
            onChange={(e) => setCustomModelName(e.target.value)}
            placeholder="Claude Haiku"
            className="studio-input"
          />
        </label>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={onAdd}
            disabled={isVerifyingModel || !customModelId.trim() || !customModelName.trim()}
            className="btn-primary"
          >
            {isVerifyingModel ? <><Loader size={16} className="animate-spin" /> Verifying…</> : 'Add model'}
          </button>
        </div>
      </div>
    </div>
  );
}
