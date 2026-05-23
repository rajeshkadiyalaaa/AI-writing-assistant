import React from 'react';
import { RotateCcw, X } from 'lucide-react';

export default function DraftRestoreBanner({ draftTime, onRestore, onDismiss }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200/80 bg-amber-50 px-4 py-2.5 text-sm">
      <p className="text-amber-900">
        Unsaved draft from {draftTime || 'earlier'} is available.
      </p>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onRestore} className="btn-secondary py-1.5 text-xs">
          <RotateCcw size={14} /> Restore
        </button>
        <button type="button" onClick={onDismiss} className="btn-ghost py-1.5 text-xs" aria-label="Dismiss">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
