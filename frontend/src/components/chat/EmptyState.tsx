import React, { useState, useRef } from 'react';
import { Sparkles, Upload, ArrowRight, BookOpen } from 'lucide-react';
import { DocumentItem } from '../../types';

interface EmptyStateProps {
  onUploadFile: (file: File) => void;
  onPromptClick: (promptText: string) => void;
  documents: DocumentItem[];
  onOpenDocuments: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onUploadFile,
  onPromptClick,
  documents,
  onOpenDocuments,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const suggestedQuestions = [
    {
      title: 'Key Concepts',
      question: 'What are the key concepts in this document?',
      desc: 'Extract foundational principles, terms, and core frameworks',
    },
    {
      title: 'Document Summary',
      question: 'Summarize this document with page citations',
      desc: 'Get an executive breakdown with verified references',
    },
    {
      title: 'Explain Simply',
      question: 'Explain this topic simply with analogies',
      desc: 'Demystify complex technical mechanisms into plain English',
    },
    {
      title: 'Exam Practice',
      question: 'Generate exam questions and study flashcards',
      desc: 'Create practice questions and answer explanations',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 flex flex-col items-center text-center animate-fadeIn">
      {/* Brand Hero Sparkle */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800/80 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-6 shadow-2xs">
        <Sparkles className="w-3.5 h-3.5 text-brand-500" />
        <span>KnowFlow AI • Document Intelligence</span>
      </div>

      {/* Main Hero Title */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
        Turn your documents <br className="hidden sm:inline" />
        into <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-500 bg-clip-text text-transparent">instant knowledge.</span>
      </h1>

      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mb-8 leading-relaxed font-normal">
        Upload PDFs, notes, reports, or study material and start asking questions.
        Answers are strictly grounded in your sources with exact page citations.
      </p>

      {/* Permanent Hidden File Input for 100% reliable browser dialog trigger */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
        className="hidden"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onUploadFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-lg p-7 rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center cursor-pointer mb-8 ${
          isDragging
            ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-500/60 bg-white dark:bg-slate-900/40 shadow-xs'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-2.5 shadow-2xs">
          <Upload className="w-5 h-5" />
        </div>
        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
          {isDragging ? 'Release to upload document' : 'Drop documents here, or browse files'}
        </h4>
        <p className="text-[11px] text-slate-400 mb-3">PDF, Word (.docx), or Text (.txt, .md) documents up to 100MB</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-2xs transition-colors cursor-pointer"
        >
          Upload document
        </button>
      </div>

      {/* If documents already indexed, show active knowledge base banner */}
      {documents.length > 0 && (
        <div className="w-full max-w-xl p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between mb-8 text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {documents.length} document{documents.length > 1 ? 's' : ''} ready in Knowledge Base
              </p>
              <p className="text-[11px] text-slate-400">
                Grounded vector search ready across your indexed library.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenDocuments}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition-colors shrink-0"
          >
            Manage Library →
          </button>
        </div>
      )}

      {/* Suggested Questions Section */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="h-px w-10 bg-slate-200 dark:border-slate-800" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Suggested questions
          </span>
          <span className="h-px w-10 bg-slate-200 dark:border-slate-800" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
          {suggestedQuestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onPromptClick(item.question)}
              className="group p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 mb-1">
                  <span>"{item.question}"</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
