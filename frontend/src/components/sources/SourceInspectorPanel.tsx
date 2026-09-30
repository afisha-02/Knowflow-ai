import React, { useState } from 'react';
import {
  X,
  FileText,
  BookOpen,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles
} from 'lucide-react';
import { SourceCitation } from '../../types';
import { api } from '../../services/api';

interface SourceInspectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sources: SourceCitation[];
  activeCitation: SourceCitation | null;
  onSelectCitation: (citation: SourceCitation) => void;
}

export const SourceInspectorPanel: React.FC<SourceInspectorPanelProps> = ({
  isOpen,
  onClose,
  sources,
  activeCitation,
  onSelectCitation,
}) => {
  const [activeTab, setActiveTab] = useState<'snippets' | 'pdf'>('snippets');
  const [selectedPage, setSelectedPage] = useState<number>(1);

  if (!isOpen) return null;

  const currentCitation = activeCitation || sources[0];
  const activeDocId = currentCitation?.document_id;
  const activeDocName = currentCitation?.document_name || 'Document';
  const displayPage = currentCitation?.page_number || selectedPage;

  const handleOpenPdfPage = (citation: SourceCitation) => {
    onSelectCitation(citation);
    setSelectedPage(citation.page_number);
    setActiveTab('pdf');
  };

  const pdfUrl = activeDocId
    ? `${api.getDocumentFileUrl(activeDocId)}#page=${displayPage}`
    : '';

  return (
    <aside className="w-80 sm:w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090e1c] flex flex-col h-full z-20 shrink-0 shadow-lg lg:shadow-none animate-slideLeft">
      {/* Header */}
      <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Source Inspector
          </h3>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 py-2 gap-2 bg-slate-50/50 dark:bg-slate-900/40">
        <button
          onClick={() => setActiveTab('snippets')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'snippets'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Excerpts ({sources.length})
        </button>
        <button
          onClick={() => setActiveTab('pdf')}
          disabled={!activeDocId}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${
            activeTab === 'pdf'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          PDF Preview
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'snippets' ? (
          sources.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p>No citations retrieved yet.</p>
              <p className="mt-1 text-[11px]">Ask a question to see grounded source snippets.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((s, idx) => {
                const isSelected = activeCitation?.chunk_id === s.chunk_id;
                const pageText = s.page_number === s.page_end || !s.page_end
                  ? `Page ${s.page_number}`
                  : `Pages ${s.page_number}-${s.page_end}`;

                return (
                  <div
                    key={s.chunk_id || idx}
                    onClick={() => onSelectCitation(s)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-500 ring-1 ring-brand-500/20 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[170px]">
                        {s.document_name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
                        {pageText}
                      </span>
                    </div>

                    {s.section && (
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 truncate">
                        Section: {s.section}
                      </p>
                    )}

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                      "{s.snippet}"
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 text-[11px]">
                      <span className="text-slate-400">
                        Match Confidence: <strong className="text-slate-700 dark:text-slate-300">{Math.round(s.score * 100)}%</strong>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPdfPage(s);
                        }}
                        className="text-brand-600 dark:text-brand-400 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        Open in PDF <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* PDF Viewer Tab */
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
              <span className="truncate max-w-[180px] font-medium text-slate-800 dark:text-slate-200">
                {activeDocName}
              </span>
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                Target: Page {displayPage}
              </span>
            </div>

            <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title="PDF Viewer"
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  Select a citation to view the PDF page.
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
              >
                Open in new window <Maximize2 className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
