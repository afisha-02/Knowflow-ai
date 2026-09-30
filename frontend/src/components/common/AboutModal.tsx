import {
  Sparkles,
  Mail,
  Code2,
  Workflow
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const techStack = [
    { label: 'Frontend', value: 'React 19, TypeScript, Tailwind CSS, Lucide' },
    { label: 'Backend API', value: 'FastAPI, Pydantic, Python 3.11+, SQLAlchemy' },
    { label: 'Vector Store', value: 'ChromaDB with local persistent storage' },
    { label: 'Embeddings', value: 'Sentence-Transformers MiniLM-L6-v2 (384-dim)' },
    { label: 'Ingestion Engine', value: 'PyMuPDF page-aware chunking (1200 / 200)' },
    { label: 'LLM Orchestration', value: 'OpenRouter (nex-agi, meta-llama, deepseek)' },
    { label: 'Streaming Protocol', value: 'Server-Sent Events (SSE) real-time tokens' },
    { label: 'RAG Paradigm', value: 'Dense retrieval + strict anti-hallucination guardrails' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              KnowFlow AI • Architecture & Project Overview
            </h3>
            <p className="text-[11px] text-slate-400 font-normal">
              Agentic Document Intelligence & RAG Platform v1.0
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        {/* Mission Statement */}
        <div className="p-4 rounded-xl bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200/80 dark:border-brand-800/60">
          <h4 className="font-bold text-brand-800 dark:text-brand-300 text-xs mb-1 uppercase tracking-wider">
            Project Mission
          </h4>
          <p className="text-xs leading-relaxed">
            KnowFlow AI is built to bridge dense, massive documents with immediate, zero-hallucination synthesis. By pairing 1-indexed page-aware parsing with local vector embeddings in ChromaDB, the platform guarantees that every factual answer is grounded directly in verified source documents with exact page citations.
          </p>
        </div>

        {/* Technology Stack Grid */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Code2 className="w-4 h-4 text-brand-500" />
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
              Technology Stack
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {techStack.map((tech, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col"
              >
                <span className="text-[10px] uppercase font-bold text-slate-400">{tech.label}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-xs mt-0.5">
                  {tech.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Agentic & Architectural Workflow */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Workflow className="w-4 h-4 text-indigo-500" />
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
              Agentic RAG Pipeline
            </h4>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
            <div>1. [Ingest] PDF Parsing → Page Boundary Extraction (PyMuPDF)</div>
            <div>2. [Chunk] Recursive Character Chunking (1200 chars / 200 overlap)</div>
            <div>3. [Embed] Dense 384-d Vector Representation (MiniLM ONNX)</div>
            <div>4. [Store] Persistent ChromaDB Local Vector Store</div>
            <div>5. [Retrieve] Scope-Filtered Cosine Similarity Search</div>
            <div>6. [Guard] Strict Zero-Hallucination Anti-Fabrication Prompts</div>
            <div>7. [Synthesize] SSE Real-Time Streaming with Page Provenance</div>
          </div>
        </div>

        {/* Developer / Portfolio & Contact Links */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-850">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>GitHub</span>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-current text-sky-600 dark:text-sky-400" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <span>LinkedIn</span>
              </a>
              <a
                href="mailto:contact@knowflow.ai"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-brand-500" />
                <span>Contact</span>
              </a>
            </div>

            <Button onClick={onClose} size="sm">
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
