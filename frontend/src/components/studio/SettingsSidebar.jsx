import React from 'react';
import { Plus, Trash2, Info, History, SlidersHorizontal, X, FileText, Key, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/cn';
import { getTaskLabel } from '../../constants/models';

export default function SettingsSidebar({
  isMobile,
  onClose,
  activeSidebarTab,
  setActiveSidebarTab,
  documentType,
  setDocumentType,
  documentTypes,
  tone,
  setTone,
  toneOptions,
  model,
  setModel,
  modelOptions,
  temperature,
  setTemperature,
  showModelInfo,
  setShowModelInfo,
  showTemperatureInfo,
  setShowTemperatureInfo,
  getModelDisplayName,
  isRecommendedModel,
  removeCustomModel,
  modelsSource,
  autoPickModel,
  setAutoPickModelPref,
  refreshModels,
  isRefreshingModels,
  setShowCustomModelForm,
  setChatMessages,
  history,
  editorVersions,
  onRestoreVersion,
  savedDocuments,
  loadDocument,
  deleteDocument,
  apiKeySet,
  maskedApiKey,
  onOpenApiKeyModal,
}) {
  const tabs = [
    { id: 'format', label: 'Style', icon: SlidersHorizontal },
    { id: 'documents', label: 'Docs', icon: FileText },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <aside className={cn('flex h-full flex-col', isMobile && 'drawer-panel left-0')}>
      {isMobile && (
        <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800">
          <h2 className="font-display text-lg font-semibold">Settings</h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close settings">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex gap-1 border-b border-zinc-200/80 p-2 dark:border-zinc-800">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSidebarTab(id)}
            className={cn('nav-tab flex-1 justify-center', activeSidebarTab === id && 'nav-tab-active')}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeSidebarTab === 'format' && (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Document type</label>
              <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="studio-select">
                {documentTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Tone</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="studio-select">
                {toneOptions.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">AI model</label>
                <button type="button" onClick={() => setShowModelInfo(!showModelInfo)} className="btn-icon h-7 w-7">
                  <Info size={14} />
                </button>
              </div>
              {showModelInfo && (
                <p className="mb-2 rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400">
                  Three free models from OpenRouter — one per writing task. ✓ matches your document type.
                  {modelsSource === 'openrouter' ? ' List refreshes every few hours.' : ' Using offline fallback.'}
                </p>
              )}
              <select
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setChatMessages([]);
                }}
                className="studio-select"
              >
                {['general', 'business', 'academic'].map((taskKey) => {
                  const group = modelOptions.filter((m) => !m.custom && m.task === taskKey);
                  if (group.length === 0) return null;
                  return (
                    <optgroup key={taskKey} label={getTaskLabel(taskKey)}>
                      {group.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}{m.strengths.includes(documentType) ? ' ✓' : ''} (free)
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
                {modelOptions.filter((m) => !m.custom && !m.task).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.strengths.includes(documentType) ? ' ✓' : ''} (free)
                  </option>
                ))}
                {modelOptions.some((m) => m.custom) && (
                  <optgroup label="Custom">
                    {modelOptions.filter((m) => m.custom).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="mt-2 text-xs text-zinc-500">
                {getModelDisplayName(model)}
                {isRecommendedModel(model) && <span className="ml-1 text-emerald-600 dark:text-emerald-400">· Recommended</span>}
              </p>

              <label className="group mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-zinc-600">
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    <Sparkles size={14} className="shrink-0 text-accent" />
                    Auto-pick model
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                    Match the best free model to your document type
                  </span>
                </div>
                <span className="relative inline-flex h-5 w-9 shrink-0">
                  <input
                    type="checkbox"
                    checked={autoPickModel}
                    onChange={(e) => setAutoPickModelPref(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      'absolute inset-0 rounded-full transition-colors',
                      'bg-zinc-200 dark:bg-zinc-600',
                      'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-zinc-900',
                      'peer-checked:bg-accent'
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                      'peer-checked:translate-x-4'
                    )}
                    aria-hidden
                  />
                </span>
              </label>

              <button
                type="button"
                onClick={refreshModels}
                disabled={isRefreshingModels}
                className="btn-secondary mt-2 w-full py-1.5 text-xs"
              >
                {isRefreshingModels ? 'Refreshing…' : 'Refresh free models'}
              </button>
              {modelOptions.find((m) => m.id === model)?.custom && (
                <button type="button" onClick={() => removeCustomModel(model)} className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:underline">
                  <Trash2 size={12} /> Remove custom model
                </button>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Creativity</label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">{temperature.toFixed(1)}</span>
                  <button type="button" onClick={() => setShowTemperatureInfo(!showTemperatureInfo)} className="btn-icon h-7 w-7">
                    <Info size={14} />
                  </button>
                </div>
              </div>
              {showTemperatureInfo && (
                <p className="mb-2 text-xs text-zinc-500">Lower = precise. Higher = creative.</p>
              )}
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
                <span>Precise</span>
                <span>Balanced</span>
                <span>Creative</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200/80 dark:border-zinc-700">
              <button
                type="button"
                onClick={onOpenApiKeyModal}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    apiKeySet
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  )}
                >
                  {apiKeySet ? <CheckCircle2 size={20} /> : <Key size={20} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {apiKeySet ? 'API key connected' : 'Connect API key'}
                  </span>
                  {apiKeySet ? (
                    maskedApiKey ? (
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {maskedApiKey}
                      </span>
                    ) : (
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Ready for AI requests
                      </span>
                    )
                  ) : (
                    <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
                      OpenRouter key required for chat & assist
                    </span>
                  )}
                </span>
                <ChevronRight size={16} className="shrink-0 text-zinc-400" />
              </button>
            </div>

            <button type="button" onClick={() => setShowCustomModelForm(true)} className="btn-secondary w-full">
              <Plus size={16} /> Add custom model
            </button>
          </div>
        )}

        {activeSidebarTab === 'documents' && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Saved documents</h3>
            {savedDocuments.length === 0 ? (
              <p className="text-sm italic text-zinc-500">Nothing saved yet. Use Save in the editor toolbar.</p>
            ) : (
              <ul className="space-y-2">
                {savedDocuments.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-800/40"
                  >
                    <button
                      type="button"
                      onClick={() => loadDocument(doc.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{doc.title}</p>
                      <p className="text-[11px] text-zinc-500">
                        {doc.date} · {doc.type}
                        {doc.tone ? ` · ${doc.tone}` : ''}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDocument(doc.id)}
                      className="btn-icon h-8 w-8 shrink-0 text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeSidebarTab === 'history' && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Restorable versions</h3>
              {!editorVersions || editorVersions.length === 0 ? (
                <p className="text-sm italic text-zinc-500">
                  Versions appear after AI improve or apply. Use Undo in the editor toolbar meanwhile.
                </p>
              ) : (
                <ul className="space-y-2">
                  {[...editorVersions].reverse().map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800/40"
                    >
                      <div>
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">{v.label}</p>
                        <p className="text-zinc-500">{v.timestamp}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRestoreVersion(v.id)}
                        className="btn-secondary shrink-0 py-1 text-[11px]"
                      >
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Recent activity</h3>
              {history.length === 0 ? (
                <p className="text-sm italic text-zinc-500">No activity yet.</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((item) => (
                    <li key={item.id} className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800/40">
                      <div className="flex justify-between font-medium text-zinc-800 dark:text-zinc-200">
                        <span>{item.action}</span>
                        <span className="text-zinc-500">{item.timestamp}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
