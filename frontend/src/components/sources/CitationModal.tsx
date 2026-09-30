import React from 'react';
import { FileText, ExternalLink, X, Quote, CheckCircle2 } from 'lucide-react';
import { SourceCitation } from '../../types';
import { api } from '../../services/api';

interface CitationModalProps {
  citation: SourceCitation | null;
  onClose: () => void;
  allCitations?: SourceCitation[];
  onSelectCitation?: (citation: SourceCitation) => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({
  citation,
  onClose,
  allCitations = [],
  onSelectCitation,
}) => {
  if (!citation) return null;

  const pageText =
    citation.page_number === citation.page_end || !citation.page_end
      ? `Page ${citation.page_number}`
      : `Pages ${citation.page_number}–${citation.page_end}`;

  const pdfUrl = citation.document_id
    ? `${api.getDocumentFileUrl(citation.document_id)}#page=${citation.page_number}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] transition-all animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {citation.document_name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-brand-600 dark:text-brand-400">{pageText}</span>
                {citation.section && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{citation.section}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Grounding Status Pill */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Verified Source Grounding</span>
          </div>

          {/* Excerpt Box */}
          <div className="relative p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
            <Quote className="w-4 h-4 text-brand-500/40 mb-2" />
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
              {citation.snippet}
            </p>
          </div>

          {/* Other citations from this response if multiple */}
          {allCitations.length > 1 && onSelectCitation && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Other Sources in this Answer ({allCitations.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allCitations.map((c, idx) => {
                  const isCurrent = c.chunk_id === citation.chunk_id;
                  const pNum =
                    c.page_number === c.page_end || !c.page_end
                      ? `p.${c.page_number}`
                      : `pp.${c.page_number}-${c.page_end}`;
                  return (
                    <button
                      key={c.chunk_id || idx}
                      onClick={() => onSelectCitation(c)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        isCurrent
                          ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-700 dark:text-brand-300 font-medium shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {c.document_name} · {pNum}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            Close
          </button>

          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Open PDF at {pageText}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
