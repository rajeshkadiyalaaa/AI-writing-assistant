import React, { useEffect, useMemo } from 'react';
import {
  Edit3, MessageCircle, Send, Loader, Bot, Trash2, Save, Undo2, Redo2, Sparkles,
  FilePlus, Copy,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { computeEditorStats } from '../../lib/writingLint';

export default function EditorPanel({
  activeTab,
  setActiveTab,
  content,
  setContent,
  chatMessages,
  messageInput,
  setMessageInput,
  chatIsGenerating,
  generateAIResponse,
  onCancelChat,
  clearChat,
  conversationStarters,
  selectConversationStarter,
  documentTypes,
  documentType,
  tone,
  getModelDisplayName,
  model,
  chatEndRef,
  saveDocument,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  textareaRef,
  onSelectionChange,
  hasSelection,
  onImproveSelection,
  isImproving,
  onInsertChatMessage,
}) {
  const stats = useMemo(() => computeEditorStats(content), [content]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (activeTab !== 'editor') return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) onUndo();
      } else if (e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) onRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, canUndo, canRedo, onUndo, onRedo]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1 border-b border-zinc-200/80 p-2">
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className={cn('nav-tab', activeTab === 'editor' && 'nav-tab-active')}
        >
          <Edit3 size={16} /> Editor
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={cn('nav-tab', activeTab === 'chat' && 'nav-tab-active')}
        >
          <MessageCircle size={16} /> Chat
        </button>
      </div>

      {activeTab === 'editor' && (
        <>
          <div className="studio-panel m-3 flex min-h-0 flex-1 flex-col overflow-hidden sm:m-4">
            {hasSelection && (
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200/80 px-3 py-2">
                <span className="text-xs text-zinc-500">Text selected</span>
                <button
                  type="button"
                  onClick={onImproveSelection}
                  disabled={isImproving}
                  className="btn-secondary py-1 text-xs"
                >
                  {isImproving ? (
                    <Loader size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Improve selection
                </button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onSelect={onSelectionChange}
              onKeyUp={onSelectionChange}
              onMouseUp={onSelectionChange}
              placeholder="Start writing, or ask the AI to draft something for you…"
              className="editor-area flex-1 p-5 sm:p-6"
            />
          </div>
          <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-200/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span>{stats.wordCount} words</span>
                <span>{stats.charCount} chars</span>
                <span>~{stats.readingMinutes} min read</span>
              </div>
              {stats.soundsAi && (
                <p className="mt-1 text-[11px] text-amber-700" title={stats.bannedHits.join(', ')}>
                  Sounds AI-ish: {stats.bannedHits.slice(0, 3).join(', ')}
                  {stats.bannedHits.length > 3 ? ` +${stats.bannedHits.length - 3}` : ''}
                </p>
              )}
              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="btn-icon h-8 w-8"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="btn-icon h-8 w-8"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2 size={16} />
                </button>
              </div>
            </div>
            <button type="button" onClick={saveDocument} disabled={!content.trim()} className="btn-primary shrink-0 py-2">
              <Save size={16} /> Save
            </button>
          </div>
        </>
      )}

      {activeTab === 'chat' && (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto w-full max-w-2xl">
              {chatMessages.length > 0 && (
                <div className="mb-4 flex justify-end">
                  <button type="button" onClick={clearChat} className="btn-ghost py-1 text-xs">
                    <Trash2 size={14} /> Clear chat
                  </button>
                </div>
              )}

              {chatMessages.length === 0 && (
                <div className="py-8 text-center animate-fade-in">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                    <img src={`${process.env.PUBLIC_URL}/favicon.svg`} alt="Scribe" className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-zinc-900">Chat with Scribe</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                    Brainstorm, outline, or refine — tuned for {documentTypes.find((t) => t.id === documentType)?.name} · {tone} tone
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {conversationStarters.map((starter, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectConversationStarter(starter)}
                        className="rounded-full border border-zinc-200/80 bg-white px-3 py-2 text-left text-xs text-zinc-600 transition hover:border-accent/40 hover:bg-accent/5"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.streaming && !msg.content ? (
                      <div className="chat-bubble-assistant flex items-center gap-2 py-3 text-[13px] font-medium text-zinc-500">
                        <Loader size={14} className="animate-spin text-zinc-400" /> Thinking...
                      </div>
                    ) : (
                      <div
                        className={cn(
                          msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant',
                          msg.isError &&
                          'border border-red-200/80 bg-red-50 text-red-900'
                        )}
                      >
                        <div className="whitespace-pre-wrap">
                          {msg.content}
                          {msg.streaming && (
                            <span className="ml-1 inline-block h-3.5 w-2 animate-pulse rounded-sm bg-zinc-800 align-middle" />
                          )}
                        </div>
                        {msg.meta && (msg.meta.wordCount != null || msg.meta.qualityScore != null) && (
                          <p className="mt-2 border-t border-zinc-200/60 pt-2 text-[10px] text-zinc-500">
                            {msg.meta.wordCount != null && <span>{msg.meta.wordCount} words</span>}
                            {msg.meta.qualityScore != null && (
                              <span className={msg.meta.wordCount != null ? ' · ' : ''}>
                                Quality {msg.meta.qualityScore}%
                              </span>
                            )}
                          </p>
                        )}
                        {msg.role === 'assistant' && msg.content && !msg.streaming && onInsertChatMessage && (
                          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-zinc-200/60 pt-2">
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(msg.content)}
                              className="btn-ghost py-1 text-[11px]"
                              title="Copy to clipboard"
                            >
                              <Copy size={12} /> Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => onInsertChatMessage(msg.content, 'append')}
                              className="btn-ghost py-1 text-[11px]"
                              title="Append to end of document"
                            >
                              <FilePlus size={12} /> Append
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-zinc-200/80 p-3 sm:p-4">
            <div className="mx-auto flex max-w-2xl gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !chatIsGenerating && messageInput.trim() && generateAIResponse()}
                placeholder="Message Scribe…"
                className="studio-input flex-1"
              />
              {chatIsGenerating && onCancelChat && (
                <button type="button" onClick={onCancelChat} className="btn-secondary shrink-0 px-3 text-xs">
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={generateAIResponse}
                disabled={chatIsGenerating || !messageInput.trim()}
                className="btn-primary shrink-0 px-4"
              >
                {chatIsGenerating ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-zinc-400">
              {getModelDisplayName(model)} · {documentTypes.find((t) => t.id === documentType)?.name}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
