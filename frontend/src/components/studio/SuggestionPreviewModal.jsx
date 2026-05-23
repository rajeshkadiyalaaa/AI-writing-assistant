import React from 'react';
import { X, Check } from 'lucide-react';

export default function SuggestionPreviewModal({
  suggestion,
  previewContent,
  warning,
  canForceApply,
  isNotFound = false,
  onAccept,
  onReject,
}) {
  const summary = suggestion.summary || suggestion.text;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onReject}
        aria-label="Close"
      />
      <div
        role="dialog"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-zinc-900">
            {isNotFound ? 'Cannot apply automatically' : 'Preview suggestion'}
          </h2>
          <button type="button" onClick={onReject} className="btn-icon" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="mb-3 text-sm text-zinc-600">{summary}</p>
        {warning && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {warning}
          </p>
        )}

        {isNotFound && (
          <p className="mb-3 text-sm text-zinc-600">
            The exact phrase is not in your document (edits may have changed it). Copy the replacement from the suggestion text, or adjust the document so the quoted phrase matches, then try again.
          </p>
        )}

        {suggestion.search && (
          <div className="mb-3 space-y-2 text-xs">
            <div>
              <span className="font-semibold text-zinc-500">Find:</span>
              <p className="mt-1 rounded-lg bg-zinc-100 p-2">{suggestion.search}</p>
            </div>
            <div>
              <span className="font-semibold text-zinc-500">Replace with:</span>
              <p className="mt-1 rounded-lg bg-emerald-50 p-2">
                {suggestion.replace ?? ''}
              </p>
            </div>
          </div>
        )}

        {previewContent && (
          <div className="mb-4 max-h-40 overflow-y-auto rounded-lg border border-zinc-200 p-3 text-sm">
            <p className="mb-1 text-xs font-semibold text-zinc-500">Result preview (opening section)</p>
            <p className="whitespace-pre-wrap text-zinc-700">{previewContent}</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onReject} className="btn-secondary">
            Cancel
          </button>
          {canForceApply && !isNotFound && (
            <button type="button" onClick={onAccept} className="btn-primary">
              <Check size={16} /> Apply anyway
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
