import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Send, Loader, Trash2, FilePlus, Copy, Check, Pencil } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useStudioChatState, useStudioChatActions } from '../../context/StudioChatContext';

const CHAT_INPUT_MAX_HEIGHT = 200;

export default function ChatPanel({
  documentTypes,
  documentType,
  tone,
  onInsertChatMessage,
}) {
  const {
    chatMessages,
    messageInput,
    isGenerating,
    conversationStarters,
    chatEndRef,
    showModelThinking,
  } = useStudioChatState();
  const {
    setMessageInput,
    generateAIResponse,
    clearChat,
    selectConversationStarter,
    cancelRequest,
  } = useStudioChatActions();

  const chatInputRef = useRef(null);
  const [copiedMsgIndex, setCopiedMsgIndex] = useState(null);

  const copyMessage = useCallback(async (text, index) => {
    if (!text?.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgIndex(index);
      setTimeout(() => setCopiedMsgIndex(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, []);

  const editUserMessage = useCallback(
    (text) => {
      if (!text?.trim()) return;
      setMessageInput(text);
      requestAnimationFrame(() => chatInputRef.current?.focus());
    },
    [setMessageInput]
  );

  const resizeChatInput = useCallback(() => {
    const el = chatInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, CHAT_INPUT_MAX_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    resizeChatInput();
  }, [messageInput, resizeChatInput]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatEndRef]);

  const handleChatKeyDown = (e) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    if (e.shiftKey) return;
    e.preventDefault();
    if (!isGenerating && messageInput.trim()) {
      generateAIResponse();
    }
  };

  const canSend = !isGenerating && Boolean(messageInput.trim());

  return (
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
            <div className="animate-fade-in py-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 px-2">
                <img
                  src={`${process.env.PUBLIC_URL}/logo.svg`}
                  alt="Scribe"
                  className="h-9 w-auto max-w-full object-contain"
                />
              </div>
              <h3 className="font-display text-xl font-semibold text-zinc-900">Chat with Scribe</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                Brainstorm, outline, or refine — tuned for{' '}
                {documentTypes.find((t) => t.id === documentType)?.name} · {tone} tone
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {conversationStarters.map((starter, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectConversationStarter(starter)}
                    className="rounded-full border border-zinc-200/80 bg-white px-3 py-2 text-left text-xs text-zinc-600 transition hover:border-brand/40 hover:bg-brand/5"
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
                  <div className="chat-bubble-assistant py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
                    </div>
                    {showModelThinking && (
                      <p className="mt-2 text-xs text-zinc-500">Model is thinking…</p>
                    )}
                  </div>
                ) : msg.role === 'user' ? (
                  <div className="flex max-w-[85%] flex-col items-end">
                    <div
                      className={cn(
                        'chat-bubble-user',
                        msg.isError && 'border border-red-300/80 bg-red-900 text-red-50'
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    {msg.content && !msg.streaming && (
                      <div className="mt-1.5 flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => copyMessage(msg.content, index)}
                          className="chat-msg-action"
                          title={copiedMsgIndex === index ? 'Copied' : 'Copy message'}
                          aria-label="Copy message"
                        >
                          {copiedMsgIndex === index ? (
                            <Check size={16} strokeWidth={1.75} />
                          ) : (
                            <Copy size={16} strokeWidth={1.75} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => editUserMessage(msg.content)}
                          className="chat-msg-action"
                          title="Edit message"
                          aria-label="Edit message"
                        >
                          <Pencil size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={cn(
                      'chat-bubble-assistant',
                      msg.isError && 'border border-red-200/80 bg-red-50 text-red-900'
                    )}
                  >
                    <div className="whitespace-pre-wrap">
                      {msg.content}
                      {msg.streaming && (
                        <span className="ml-0.5 inline-block h-4 w-0.5 animate-bounce bg-brand align-middle" />
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
                    {msg.content && !msg.streaming && (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-zinc-200/60 pt-2">
                        <button
                          type="button"
                          onClick={() => copyMessage(msg.content, index)}
                          className="btn-ghost py-1 text-[11px]"
                          title="Copy message"
                        >
                          {copiedMsgIndex === index ? (
                            <>
                              <Check size={12} /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copy
                            </>
                          )}
                        </button>
                        {onInsertChatMessage && (
                          <button
                            type="button"
                            onClick={() => onInsertChatMessage(msg.content)}
                            className="btn-ghost py-1 text-[11px]"
                            title="Add to document"
                          >
                            <FilePlus size={12} /> Append
                          </button>
                        )}
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

      <div className="shrink-0 border-t border-zinc-200/80 bg-surface-50/80 p-3 sm:p-4">
        <div className="mx-auto max-w-2xl">
          <div
            className={cn(
              'relative flex items-end gap-2 rounded-2xl border border-zinc-200/90 bg-white px-3 py-2 shadow-sm transition',
              'focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/15',
              isGenerating && 'opacity-90'
            )}
          >
            <textarea
              ref={chatInputRef}
              rows={1}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Message Scribe…"
              disabled={isGenerating}
              className="max-h-[200px] min-h-[24px] flex-1 resize-none border-0 bg-transparent py-1.5 text-[15px] leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Chat message"
            />
            <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
              {isGenerating && (
                <button
                  type="button"
                  onClick={cancelRequest}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                >
                  Stop
                </button>
              )}
              <button
                type="button"
                onClick={generateAIResponse}
                disabled={!canSend}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full transition',
                  canSend
                    ? 'bg-brand text-white shadow-sm hover:bg-brand-hover'
                    : 'bg-zinc-100 text-zinc-400'
                )}
                aria-label="Send message"
              >
                {isGenerating ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
