import React, { useState } from 'react';
import {
  User,
  Sparkles,
  Copy,
  Check,
  RotateCw,
  FileText,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Wand2,
  ListFilter,
  FileSpreadsheet,
  HelpCircle,
  Layers,
  CornerDownRight,
  BookOpen,
  Zap,
  Server,
  Cloud
} from 'lucide-react';
import { Message, SourceCitation } from '../../types';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

interface MessageItemProps {
  message: Message;
  onSelectCitation?: (citation: SourceCitation) => void;
  onOpenPage?: (pageNumber: number, docName?: string) => void;
  onRegenerate?: () => void;
  onSmartAction?: (promptText: string) => void;
  isLatestAssistant?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onSelectCitation,
  onOpenPage,
  onRegenerate,
  onSmartAction,
  isLatestAssistant = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback((prev) => (prev === type ? null : type));
  };

  const sources = message.sources || [];

  // Deduplicate and group citations by document and page to create compact chips
  const uniqueCitations: SourceCitation[] = [];
  const seenKeys = new Set<string>();
  for (const s of sources) {
    const key = `${s.document_id || s.document_name}_${s.page_number}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueCitations.push(s);
    }
  }

  // Handle inline citation click from Markdown
  const handleInlineCitationClick = (pageNum: number, docName?: string) => {
    const matched = sources.find(
      (s) =>
        s.page_number === pageNum &&
        (!docName || s.document_name.toLowerCase().includes(docName.toLowerCase()))
    ) || sources.find((s) => s.page_number === pageNum) || sources[0];

    if (matched && onSelectCitation) {
      onSelectCitation(matched);
    } else if (onOpenPage) {
      onOpenPage(pageNum, docName);
    }
  };

  const smartActions = [
    { label: 'Explain simpler', icon: Wand2, prompt: 'Please explain this in simpler terms with intuitive analogies and clear examples.' },
    { label: 'Key takeaways', icon: FileSpreadsheet, prompt: 'Extract the essential bullet points and core takeaways from this answer.' },
    { label: 'Summarize', icon: ListFilter, prompt: 'Please provide a concise, high-impact executive summary of the key findings from this answer.' },
    { label: 'Create notes', icon: BookOpen, prompt: 'Format the above explanation into structured Cornell-style study notes.' },
    { label: 'Generate quiz', icon: HelpCircle, prompt: 'Generate 3 multiple-choice practice questions with options and explanations based on this answer.' },
    { label: 'Follow-up questions', icon: CornerDownRight, prompt: 'What are the main implications or next logical questions to explore based on this?' },
  ];

  // Provider badge indicator
  const renderProviderBadge = () => {
    const prov = message.provider;
    if (prov === 'ollama') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Server className="w-2.5 h-2.5" />
          <span>Ollama Local</span>
        </span>
      );
    }
    if (prov === 'local' || prov === ('local_synthesizer' as any)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Zap className="w-2.5 h-2.5" />
          <span>Local Engine</span>
        </span>
      );
    }
    // Default openrouter
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
        <Cloud className="w-2.5 h-2.5" />
        <span>OpenRouter Cloud</span>
      </span>
    );
  };

  return (
    <div
      className={`py-5 px-4 sm:px-6 transition-colors ${
        isUser
          ? 'bg-transparent'
          : 'bg-white/50 dark:bg-slate-900/40 border-y border-slate-200/60 dark:border-slate-800/60'
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-3.5 sm:gap-4.5 items-start">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-2xs">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Header row: Author, Provider, Mode, Timestamp */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                {isUser ? 'You' : 'KnowFlow AI'}
              </span>

              {!isUser && renderProviderBadge()}

              {!isUser && (
                <>
                  {message.mode === 'general' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <span>🤖</span> General Knowledge
                    </span>
                  ) : message.mode === 'mixed' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      <span>🔀</span> Document + General
                    </span>
                  ) : (uniqueCitations.length > 0 || message.mode === 'document') && message.content ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span>📄</span> Document Grounded
                    </span>
                  ) : null}
                </>
              )}

              <span className="text-[10px] text-slate-400">
                {new Date(message.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Top right quick actions for assistant */}
            {!isUser && (
              <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Copy answer"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                {isLatestAssistant && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Regenerate answer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Hero Answer / Message Text */}
          <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {isUser ? (
              <p className="whitespace-pre-wrap font-normal text-slate-900 dark:text-slate-100">
                {message.content}
              </p>
            ) : (
              <MarkdownRenderer
                content={message.content}
                onCitationClick={handleInlineCitationClick}
              />
            )}
          </div>

          {/* COMPACT CITATIONS ROW */}
          {!isUser && message.mode !== 'general' && uniqueCitations.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Sources:
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                {uniqueCitations.map((s, idx) => {
                  const pageLabel =
                    s.page_number === s.page_end || !s.page_end
                      ? `p.${s.page_number}`
                      : `pp.${s.page_number}–${s.page_end}`;

                  return (
                    <button
                      key={s.chunk_id || idx}
                      onClick={() => onSelectCitation && onSelectCitation(s)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-750 hover:border-brand-500 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                      title={`Inspect passage from ${s.document_name}, ${pageLabel}`}
                    >
                      <FileText className="w-3 h-3 text-brand-500 group-hover:scale-105 transition-transform" />
                      <span className="font-semibold truncate max-w-[160px] sm:max-w-xs">{s.document_name}</span>
                      <span className="text-slate-400 dark:text-slate-500">•</span>
                      <span className="text-brand-600 dark:text-brand-400">{pageLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Utility Toolbar & Smart AI Actions for Assistant */}
          {!isUser && message.content && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-850/80 space-y-2">
              {/* Thumbs Feedback & Utility Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-slate-400">
                  <button
                    onClick={() => handleFeedback('up')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      feedback === 'up'
                        ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50'
                        : 'hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Helpful response"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleFeedback('down')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      feedback === 'down'
                        ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/50'
                        : 'hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Needs improvement"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
                    title="Copy response"
                  >
                    {copied ? (
                      <span className="text-[11px] text-emerald-500 flex items-center gap-1 font-medium">
                        <Check className="w-3 h-3" /> Copied
                      </span>
                    ) : (
                      <span className="text-[11px] flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copy
                      </span>
                    )}
                  </button>
                </div>

                {isLatestAssistant && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition-colors"
                    title="Regenerate this answer"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>

              {/* SMART AI ACTIONS CHIPS */}
              {isLatestAssistant && onSmartAction && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {smartActions.map((action, aIdx) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={aIdx}
                        onClick={() => onSmartAction(action.prompt)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100/90 dark:bg-slate-800/80 hover:bg-brand-50 dark:hover:bg-brand-950/50 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-300 border border-slate-200/70 dark:border-slate-750 hover:border-brand-300 dark:hover:border-brand-800 transition-all shadow-2xs"
                      >
                        <Icon className="w-3 h-3 text-brand-500" />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
