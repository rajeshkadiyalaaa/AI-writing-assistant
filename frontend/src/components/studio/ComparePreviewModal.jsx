import React from 'react';
import { X, Check } from 'lucide-react';

export default function ComparePreviewModal({
  title,
  subtitle,
  before,
  after,
  selectionLabel,
  onAccept,
  onReject,
}) {
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
        aria-labelledby="compare-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 id="compare-title" className="font-display text-lg font-semibold text-zinc-900">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
            {selectionLabel && (
              <p className="mt-1 text-xs text-accent">{selectionLabel}</p>
            )}
          </div>
          <button type="button" onClick={onReject} className="btn-icon" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-2">
          <div className="flex min-h-0 flex-col border-b border-zinc-200 md:border-b-0 md:border-r">
            <p className="shrink-0 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Before
            </p>
            <pre className="min-h-[12rem] flex-1 overflow-y-auto whitespace-pre-wrap p-4 font-sans text-sm leading-relaxed text-zinc-700">
              {before}
            </pre>
          </div>
          <div className="flex min-h-0 flex-col">
            <p className="shrink-0 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              After
            </p>
            <pre className="min-h-[12rem] flex-1 overflow-y-auto whitespace-pre-wrap p-4 font-sans text-sm leading-relaxed text-zinc-700">
              {after}
            </pre>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
          <button type="button" onClick={onReject} className="btn-secondary">
            Keep original
          </button>
          <button type="button" onClick={onAccept} className="btn-primary">
            <Check size={16} /> Accept changes
          </button>
        </div>
      </div>
    </div>
  );
}
