import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, BookOpen, Trash2, Maximize2, Minimize2 } from 'lucide-react';

const STORAGE_KEY = 'osel_tutor_chat';
const QUICK_PROMPTS = [
  'Explain FCFS vs SJF in one paragraph.',
  'Why do page faults happen in paging?',
  'How is cache hit rate computed?',
];

const loadHistory = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

const saveHistory = (messages) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    // Ignore write failures.
  }
};

const AITutorDock = ({ apiBaseUrl, queuedPrompt, onQueuedHandled, contextHint }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => (typeof window === 'undefined' ? [] : loadHistory()));
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const endpoint = useMemo(() => {
    if (!apiBaseUrl) return '/api/chat';
    return apiBaseUrl.endsWith('/api/chat') ? apiBaseUrl : `${apiBaseUrl}/api/chat`;
  }, [apiBaseUrl]);

  const trimmedHistory = (items) => items.slice(-12);

  const sendMessage = async (text, hint = contextHint) => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError(null);

    const nextMessages = trimmedHistory([...messages, { role: 'user', content: text }]);
    setMessages(nextMessages);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          contextHint: hint,
          history: nextMessages.filter((item) => item.role !== 'system'),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const detail = data?.details ? ` ${data.details}` : '';
        throw new Error(`${data?.error || 'Tutor request failed.'}${detail}`);
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.answer || 'No answer returned.',
        citations: data.citations || [],
      };

      const updated = trimmedHistory([...nextMessages, assistantMessage]);
      setMessages(updated);
    } catch (err) {
      setError(err.message || 'Failed to reach tutor server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (queuedPrompt) {
      setIsOpen(true);
      sendMessage(queuedPrompt, contextHint);
      onQueuedHandled?.();
    }
  }, [queuedPrompt, contextHint]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            drag={!isFullscreen}
            dragMomentum={false}
            className={`fixed z-50 ${
              isFullscreen
                ? 'inset-4'
                : 'bottom-6 right-6 w-[520px] max-w-[94vw]'
            }`}
          >
            <div className="relative glass rounded-[28px] border border-white/15 shadow-[0_30px_80px_-40px_rgba(56,189,248,0.8)] overflow-hidden bg-gradient-to-br from-slate-950/80 via-slate-900/85 to-slate-950/80">
              <motion.div
                className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/30 blur-[90px]"
                animate={{ opacity: [0.2, 0.55, 0.2] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="pointer-events-none absolute -right-8 bottom-10 h-36 w-36 rounded-full bg-fuchsia-500/20 blur-[100px]"
                animate={{ opacity: [0.15, 0.45, 0.15] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500" />
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/70 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-[0_10px_30px_rgba(34,211,238,0.45)]">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">OS Tutor</div>
                    <div className="text-[11px] text-neutral-400">RAG assistant</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setError(null);
                      saveHistory([]);
                    }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                    aria-label="Clear chat"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullscreen((prev) => !prev)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                    aria-label="Toggle fullscreen"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4 text-white" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <span className="text-[10px] uppercase tracking-[0.35em] text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded-full border border-cyan-400/40">
                    Online
                  </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                </div>
              </div>

              <div className={`${
                isFullscreen ? 'max-h-[calc(100vh-220px)]' : 'max-h-[520px]'
              } overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar`}>
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="text-sm text-neutral-300">
                      Ask about scheduling, paging, caching, or anything from your notes.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => sendMessage(prompt)}
                          className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-2 text-[11px] text-slate-200 hover:border-cyan-400/60"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={`${msg.role}-${idx}`}
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      msg.role === 'assistant'
                        ? 'bg-gradient-to-br from-slate-900/80 to-slate-900/40 text-slate-100 border border-white/10 shadow-[0_12px_30px_-24px_rgba(148,163,184,0.8)]'
                        : 'bg-gradient-to-br from-cyan-500/40 to-blue-500/30 text-white border border-cyan-400/40 shadow-[0_12px_30px_-24px_rgba(14,165,233,0.8)]'
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-1">
                      {msg.role === 'assistant' ? 'Tutor' : 'You'}
                    </div>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.citations?.length > 0 && (
                      <div className="mt-2 border-t border-white/10 pt-2 space-y-1 text-[11px] text-neutral-400">
                        {msg.citations.map((cite) => (
                          <div key={cite.id} className="flex items-start gap-2">
                            <BookOpen className="w-3 h-3 text-cyan-300 mt-0.5" />
                            <div>
                              <div className="text-xs text-white">[{cite.id}] {cite.source}</div>
                              <div className="text-[10px] text-neutral-500">{cite.snippet}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-cyan-300">
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          className="h-1.5 w-1.5 rounded-full bg-cyan-300"
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.2 }}
                        />
                      ))}
                    </div>
                    Typing
                  </div>
                )}
                {error && <div className="text-xs text-amber-300">{error}</div>}
              </div>

              <div className="border-t border-white/10 bg-slate-950/70 px-5 py-4">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendMessage(input);
                    setInput('');
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask a question"
                    className="flex-1 bg-slate-900/70 border border-white/10 rounded-2xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white flex items-center justify-center shadow-[0_10px_30px_rgba(14,165,233,0.45)] hover:scale-[1.02] disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-[0_25px_60px_-25px_rgba(34,211,238,0.9)] px-4 py-3"
        >
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
            <span className="absolute inset-0 rounded-full bg-cyan-300/40 animate-ping" />
            <Bot className="relative w-6 h-6" />
          </span>
          <div className="text-left">
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-100">Ask AI</div>
            <div className="text-sm font-semibold">OS Tutor</div>
          </div>
        </motion.button>
      )}
    </>
  );
};

export default AITutorDock;
