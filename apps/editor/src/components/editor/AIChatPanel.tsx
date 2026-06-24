'use client';

import { useState, useRef } from 'react';
import type { Changeset, ValidationResult } from '@castor/types';
import { api, ApiError } from '@/lib/api';

interface Props {
  siteId: string;
  pageId: string;
  token: string;
  suggestion: Changeset | null;
  onSuggestion: (s: Changeset) => void;
  onApply: () => void;
  onDismiss: () => void;
}

interface Message {
  role: 'user' | 'assistant' | 'error';
  text: string;
  suggestion?: Changeset;
  validation?: ValidationResult;
}

export function AIChatPanel({
  siteId,
  pageId,
  token,
  suggestion,
  onSuggestion,
  onApply,
  onDismiss,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    const prompt = input.trim();
    if (!prompt || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: prompt }]);
    setLoading(true);

    try {
      const result = await api.ai.suggest(siteId, pageId, prompt, token);
      const slotCount = Object.keys(result.suggestion).length;
      const summaryText = result.validation.approved
        ? `Suggested ${slotCount} change${slotCount !== 1 ? 's' : ''}. Click Apply to use them.`
        : `Suggested ${slotCount} change${slotCount !== 1 ? 's' : ''}, but ${result.validation.rejections.length} failed validation.`;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: summaryText,
          suggestion: result.suggestion,
          validation: result.validation,
        },
      ]);

      if (result.validation.approved) {
        onSuggestion(result.suggestion);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'error', text: err instanceof ApiError ? err.message : 'AI request failed' },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <aside className="w-72 flex flex-col border-r border-gray-800 bg-gray-950">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-sm font-medium">AI Chat</span>
        {suggestion && (
          <div className="flex gap-2">
            <button
              onClick={onApply}
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded transition-colors"
            >
              Apply
            </button>
            <button
              onClick={onDismiss}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-4">
            Ask me to update the page content.<br />
            E.g. "Make the headline more urgent"
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-900/40 text-blue-100 ml-4'
                : msg.role === 'error'
                ? 'bg-red-900/40 text-red-300'
                : 'bg-gray-800 text-gray-200'
            }`}
          >
            <p>{msg.text}</p>
            {msg.validation && !msg.validation.approved && (
              <div className="mt-2 space-y-1">
                {msg.validation.rejections.map((r, j) => (
                  <p key={j} className="text-xs text-red-400">
                    {r.rule}: {r.message}
                  </p>
                ))}
              </div>
            )}
            {msg.suggestion && msg.validation?.approved && (
              <div className="mt-2">
                <button
                  onClick={() => { onSuggestion(msg.suggestion!); onApply(); }}
                  className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded transition-colors"
                >
                  Apply this suggestion
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-400 animate-pulse">
            Thinking…
          </div>
        )}
      </div>

      <div className="border-t border-gray-800 p-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI to update content…"
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="mt-2 w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
        >
          Send
        </button>
      </div>
    </aside>
  );
}
