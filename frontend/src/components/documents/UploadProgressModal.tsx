import React from 'react';
import {
  FileText,
  CheckCircle2,
  Loader2,
  ArrowRight,
  X,
  AlertCircle
} from 'lucide-react';
import { DocumentItem } from '../../types';

interface UploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  onStartChatWithDoc?: (docId: string) => void;
}

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  isOpen,
  onClose,
  document,
  onStartChatWithDoc,
}) => {
  if (!isOpen || !document) return null;

  const status = document.status;
  const isCompleted = status === 'COMPLETED';
  const isFailed = status === 'FAILED';

  // Status mapping to steps
  // Steps:
  // 1: File uploaded (COMPLETED when status != 'UPLOADING' or isCompleted)
  // 2: Extracting text (COMPLETED when status is 'CHUNKING' | 'EMBEDDING' | 'INDEXING' | 'COMPLETED')
  // 3: Splitting into chunks (COMPLETED when status is 'EMBEDDING' | 'INDEXING' | 'COMPLETED')
  // 4: Generating embeddings (COMPLETED when status is 'INDEXING' | 'COMPLETED')
  // 5: Indexing knowledge (COMPLETED when status is 'COMPLETED')
  // 6: Ready (when isCompleted)

  const steps = [
    {
      id: 'upload',
      label: 'File uploaded',
      isDone: status !== 'UPLOADING' || isCompleted,
      isActive: status === 'UPLOADING',
    },
    {
      id: 'extract',
      label: 'Extracting text',
      isDone: ['CHUNKING', 'EMBEDDING', 'INDEXING', 'COMPLETED'].includes(status),
      isActive: status === 'EXTRACTING',
    },
    {
      id: 'chunk',
      label: 'Splitting into chunks',
      isDone: ['EMBEDDING', 'INDEXING', 'COMPLETED'].includes(status),
      isActive: status === 'CHUNKING',
    },
    {
      id: 'embed',
      label: 'Generating embeddings',
      isDone: ['INDEXING', 'COMPLETED'].includes(status),
      isActive: status === 'EMBEDDING',
    },
    {
      id: 'index',
      label: 'Indexing knowledge',
      isDone: isCompleted,
      isActive: status === 'INDEXING',
    },
    {
      id: 'ready',
      label: 'Ready',
      isDone: isCompleted,
      isActive: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={isCompleted || isFailed ? onClose : undefined}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-850 rounded-2xl shadow-2xl overflow-hidden z-10 p-6 flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[240px]">
                {document.original_name}
              </h3>
              <p className="text-[11px] text-slate-400">Document Ingestion Pipeline</p>
            </div>
          </div>

          {(isCompleted || isFailed) && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stepper Checklist */}
        <div className="py-2 space-y-2.5 border-y border-slate-100 dark:border-slate-850/80 my-2">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-2.5">
                {step.isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : step.isActive ? (
                  <Loader2 className="w-4 h-4 text-brand-500 animate-spin shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                    {idx + 1}
                  </span>
                )}
                <span
                  className={`font-medium ${
                    step.isDone
                      ? 'text-slate-900 dark:text-slate-100'
                      : step.isActive
                      ? 'text-brand-600 dark:text-brand-400 font-semibold'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {step.isActive && (
                <span className="text-[10px] font-mono text-brand-600 dark:text-brand-400">
                  {document.progress}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Success / Error Feedback Info */}
        {isCompleted && (
          <div className="mt-3 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-850 text-center space-y-2">
            <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              Your document is ready.
            </p>
            <div className="flex items-center justify-center gap-3 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
              <span>{document.page_count} pages</span>
              <span>•</span>
              <span>{document.chunk_count} chunks</span>
              <span>•</span>
              <span>Knowledge indexed</span>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="mt-3 p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-850 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{document.error_message || 'Document processing failed.'}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          {isCompleted ? (
            <>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              {onStartChatWithDoc && (
                <button
                  onClick={() => {
                    onStartChatWithDoc(document.id);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>Chat with Document</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          ) : isFailed ? (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
            >
              Dismiss
            </button>
          ) : (
            <p className="text-[11px] text-slate-400 text-center w-full py-1">
              Processing in background... You can close this window at any time.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
