import React, { useState } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  MessageSquare,
  Search,
  AlertCircle,
  ExternalLink,
  GraduationCap,
  Eye,
  X
} from 'lucide-react';
import { DocumentItem } from '../../types';
import { api } from '../../services/api';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface DocumentStudioProps {
  documents: DocumentItem[];
  onUploadFile: (file: File) => void;
  onDeleteDocument: (id: string) => void;
  onStartChatWithDoc: (docId: string) => void;
  onOpenStudyTools: (docId: string) => void;
}

export const DocumentStudio: React.FC<DocumentStudioProps> = ({
  documents,
  onUploadFile,
  onDeleteDocument,
  onStartChatWithDoc,
  onOpenStudyTools,
}) => {
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);

  const filtered = documents.filter((d) =>
    d.original_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = documents.reduce((acc, d) => acc + (d.page_count || 0), 0);
  const totalChunks = documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0);
  const completedCount = documents.filter((d) => d.status === 'COMPLETED').length;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validExts = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];
      if (validExts.some((ext) => file.name.toLowerCase().endsWith(ext))) {
        onUploadFile(file);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Document Library
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Grounded knowledge base. Indexed documents with page-level vector embeddings.
          </p>
        </div>

        <div>
          <input
            type="file"
            id="doc-studio-upload"
            accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onUploadFile(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />
          <Button
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => document.getElementById('doc-studio-upload')?.click()}
          >
            Upload Document
          </Button>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Documents</span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{documents.length}</p>
          <span className="text-[11px] text-emerald-500 font-medium">{completedCount} indexed & ready</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pages</span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{totalPages.toLocaleString()}</p>
          <span className="text-[11px] text-slate-400">Page-accurate citations</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vector Chunks</span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{totalChunks.toLocaleString()}</p>
          <span className="text-[11px] text-slate-400">384-d dense embeddings</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vector Store</span>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {completedCount > 0 ? 'Active' : 'Idle'}
          </p>
          <span className="text-[11px] text-slate-400">ChromaDB Persistent</span>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('doc-studio-upload')?.click()}
        className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer ${
          isDragging
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-slate-200 dark:border-slate-800 hover:border-brand-400 bg-white/50 dark:bg-slate-900/30'
        }`}
      >
        <Upload className="w-5 h-5 text-brand-500 mb-1.5" />
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Drag and drop PDF, Word, or Text documents here, or click to browse
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">Automated extraction, chunking, and embedding pipeline</p>
      </div>

      {/* Documents Table & Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 self-start">
            Documents ({filtered.length})
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">No documents found</p>
            <p className="text-[11px] text-slate-400 mt-1">Upload a PDF to begin building your knowledge base.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((doc) => {
              const isCompleted = doc.status === 'COMPLETED';
              const isFailed = doc.status === 'FAILED';
              const isProcessing = !isCompleted && !isFailed;

              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  {/* Left: Icon and Details */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-sm">
                          {doc.original_name}
                        </h4>
                        {isCompleted && (
                          <Badge variant="success" size="sm" dot>
                            Ready
                          </Badge>
                        )}
                        {isProcessing && (
                          <Badge variant="warning" size="sm" dot>
                            {doc.status} ({doc.progress}%)
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge variant="error" size="sm" dot>
                            Failed
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {doc.page_count} pages
                        </span>
                        <span>•</span>
                        <span>{doc.chunk_count} chunks</span>
                        <span>•</span>
                        <span>{formatBytes(doc.file_size)}</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>

                      {isFailed && doc.error_message && (
                        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{doc.error_message}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => onStartChatWithDoc(doc.id)}
                      disabled={!isCompleted}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:hover:bg-brand-900/80 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800 disabled:opacity-40 transition-colors cursor-pointer"
                      title="Start Chat with this document"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>

                    <button
                      onClick={() => onOpenStudyTools(doc.id)}
                      disabled={!isCompleted}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                      title="Open Study Tools for this document"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-brand-500" />
                      <span>Study</span>
                    </button>

                    <button
                      onClick={() => setInspectDoc(doc)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Inspect document details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <a
                      href={api.getDocumentFileUrl(doc.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Open PDF"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => {
                        if (confirm(`Delete "${doc.original_name}" and remove all its embeddings?`)) {
                          onDeleteDocument(doc.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inspect Document Modal */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setInspectDoc(null)}
          />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-brand-500" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {inspectDoc.original_name}
                  </h3>
                  <p className="text-[11px] text-slate-400">Document Metadata & Vector Status</p>
                </div>
              </div>
              <button
                onClick={() => setInspectDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Pages</span>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {inspectDoc.page_count}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Vector Chunks</span>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {inspectDoc.chunk_count}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">File Size</span>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {formatBytes(inspectDoc.file_size)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {inspectDoc.status}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <a
                href={api.getDocumentFileUrl(inspectDoc.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                <span>View Full PDF</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <Button size="sm" onClick={() => setInspectDoc(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
