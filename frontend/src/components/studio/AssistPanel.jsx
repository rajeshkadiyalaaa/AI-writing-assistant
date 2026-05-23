import React from 'react';
import { RefreshCw, PenTool, Check, Trash2, Loader, X, Sparkles } from 'lucide-react';
import { cn } from '../../lib/cn';

const typeStyles = {
  grammar: 'bg-red-100 text-red-700',
  improvement: 'bg-blue-100 text-blue-700',
  alternative: 'bg-emerald-100 text-emerald-700',
};

function getTypeStyle(type) {
  return Object.prototype.hasOwnProperty.call(typeStyles, type)
    ? typeStyles[type]
    : typeStyles.improvement;
}

export default function AssistPanel({
  isMobile,
  onClose,
  suggestions,
  isGenerating,
  content,
  apiKeySet,
  renderApiKeyPrompt,
  generateSuggestions,
  improveWriting,
  improveSelection,
  hasSelection,
  applySuggestion,
  setSuggestions,
}) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-zinc-200/80',
        isMobile ? 'bottom-sheet' : 'border-l bg-white/50'
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-accent" />
          <h2 className="font-display text-sm font-semibold text-zinc-900">AI Assist</h2>
        </div>
        {isMobile && (
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close assist panel">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {suggestions.length === 0 && !isGenerating && apiKeySet && (
          <div className="mb-4 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 text-xs text-zinc-600">
            <p className="mb-2 font-semibold text-zinc-700">What each action does</p>
            <ul className="space-y-1.5 list-disc pl-4">
              <li><strong>Review draft</strong> — numbered feedback (grammar, style, clarity).</li>
              <li><strong>Rewrite for clarity</strong> — full pass with before/after compare.</li>
              <li><strong>Improve selection</strong> — highlight text in the editor first.</li>
            </ul>
          </div>
        )}
        {suggestions.length === 0 && !isGenerating ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {!apiKeySet ? (
              <>
                {renderApiKeyPrompt()}
                <p className="mt-4 text-sm text-zinc-500">Connect your API key to unlock suggestions.</p>
              </>
            ) : (
              <>
                <RefreshCw className="mb-3 text-zinc-300" size={32} />
                <p className="text-sm text-zinc-500">Write in the editor, then pick an action above.</p>
              </>
            )}
          </div>
        ) : isGenerating ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Loader size={32} className="animate-spin text-accent" />
            <p className="mt-4 font-medium text-zinc-700">Analyzing your draft…</p>
            <p className="mt-1 text-xs text-zinc-500">This usually takes a few seconds</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {suggestions.map((s, index) => (
              <li
                key={s.id}
                className="suggestion-card animate-waterfall"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className={cn('chip', getTypeStyle(s.type))}>
                    {s.type}
                  </span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => applySuggestion(s.id)} className="btn-icon h-8 w-8" title="Apply">
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuggestions(suggestions.filter((x) => x.id !== s.id))}
                      className="btn-icon h-8 w-8"
                      title="Dismiss"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-zinc-700">
                  {s.summary && s.summary !== s.text ? s.summary : s.text}
                </p>
                {s.search && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Find: <span className="font-medium text-zinc-600">“{s.search}”</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-zinc-200/80 p-4">
        <button
          type="button"
          onClick={generateSuggestions}
          disabled={isGenerating || !content.trim()}
          className="btn-primary w-full"
          title="Structured feedback on grammar, style, and clarity"
        >
          {isGenerating ? <Loader size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Review draft
        </button>
        <button
          type="button"
          onClick={improveWriting}
          disabled={isGenerating || !content.trim()}
          className="btn-secondary w-full"
          title="Rewrite the full document for readability"
        >
          {isGenerating ? <Loader size={16} className="animate-spin" /> : <PenTool size={16} />}
          Rewrite for clarity
        </button>
        {hasSelection && (
          <button
            type="button"
            onClick={improveSelection}
            disabled={isGenerating}
            className="btn-secondary w-full border-accent/30 text-accent"
          >
            {isGenerating ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Improve selection only
          </button>
        )}
        <p className="text-center text-[10px] text-zinc-400">
          Review = feedback · Rewrite = full pass · Select text for partial improve
        </p>
      </div>
    </aside>
  );
}
