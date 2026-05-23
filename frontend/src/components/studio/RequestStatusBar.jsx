import React from 'react';
import { Loader, X, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function RequestStatusBar({
  visible,
  isSlow,
  message,
  error,
  onCancel,
  onRetry,
  canRetry,
  className,
}) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2 text-sm',
        error
          ? 'border-red-200/80 bg-red-50 text-red-900'
          : 'border-amber-200/80 bg-amber-50 text-amber-950',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {!error && <Loader size={16} className="shrink-0 animate-spin" />}
        <span className="truncate">
          {error || (isSlow ? 'Still working… this can take a moment on free models.' : message || 'Working…')}
        </span>
      </div>
      <div className="flex shrink-0 gap-2">
        {error && canRetry && (
          <button type="button" onClick={onRetry} className="btn-secondary py-1 text-xs">
            <RotateCcw size={14} /> Retry
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost py-1 text-xs">
            <X size={14} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
