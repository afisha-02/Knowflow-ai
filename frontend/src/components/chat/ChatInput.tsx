import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, Layers, Loader2, Sparkles, Server, Zap, Cloud } from 'lucide-react';
import { DocumentItem } from '../../types';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  onTriggerUpload: () => void;
  selectedScope: string;
  onScopeChange: (scope: string) => void;
  documents: DocumentItem[];
  ragStatus?: string | null;
  disabled?: boolean;
  provider?: 'openrouter' | 'ollama' | 'local';
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  onTriggerUpload,
  selectedScope,
  onScopeChange,
  documents,
  ragStatus,
  disabled = false,
  provider = 'openrouter',
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isStreaming || disabled) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getProviderIcon = () => {
    if (provider === 'ollama') return <Server className="w-3 h-3 text-emerald-500" />;
    if (provider === 'local') return <Zap className="w-3 h-3 text-amber-500" />;
    return <Cloud className="w-3 h-3 text-sky-500" />;
  };

  const getProviderLabel = () => {
    if (provider === 'ollama') return 'Ollama Local';
    if (provider === 'local') return 'Local Synthesizer';
    return 'OpenRouter Cloud';
  };

  return (
    <div className="p-4 max-w-4xl mx-auto w-full">
      {/* Safe RAG Pipeline Status Indicator */}
      {isStreaming && ragStatus && (
        <div className="flex items-center justify-center gap-2 mb-2 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50/90 dark:bg-brand-950/80 border border-brand-200/80 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-medium shadow-xs backdrop-blur-sm">
            <Loader2 className="w-3 h-3 text-brand-500 animate-spin" />
            <span>{ragStatus}</span>
          </div>
        </div>
      )}

      {/* Input Card Container */}
      <form
        onSubmit={handleSubmit}
        className="relative flex flex-col bg-white/90 dark:bg-[#0c1222]/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none focus-within:border-brand-500/80 dark:focus-within:border-brand-500/80 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all p-3 backdrop-blur-md"
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your documents, contracts, or research..."
          disabled={disabled}
          rows={1}
          className="w-full px-2 py-1.5 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none max-h-48 leading-relaxed font-normal"
        />

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 px-1 mt-1">
          {/* Left toolbar: upload, scope, provider badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onTriggerUpload}
              className="p-1.5 text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs cursor-pointer font-medium"
              title="Upload Document"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Attach Doc</span>
            </button>

            {/* Scope selector dropdown */}
            <div className="relative flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg bg-slate-100/70 dark:bg-slate-850/70 border border-slate-200/60 dark:border-slate-750">
              <Layers className="w-3 h-3 text-brand-500 shrink-0" />
              <select
                value={selectedScope}
                onChange={(e) => onScopeChange(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-medium text-[11px] focus:outline-none cursor-pointer max-w-[120px] sm:max-w-[180px] truncate"
              >
                <option value="all" className="bg-white dark:bg-slate-900">
                  All Library ({documents.length})
                </option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900">
                    {d.original_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Provider indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md bg-slate-100/50 dark:bg-slate-850/50 border border-slate-200/40 dark:border-slate-800 font-medium">
              {getProviderIcon()}
              <span>{getProviderLabel()}</span>
            </div>
          </div>

          {/* Right send/stop button */}
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-[10px] text-slate-400 dark:text-slate-500">
              Enter ↵
            </span>

            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center justify-center cursor-pointer"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!text.trim() || disabled}
                className="p-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-30 disabled:hover:from-brand-600 text-white shadow-md shadow-brand-500/20 transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
