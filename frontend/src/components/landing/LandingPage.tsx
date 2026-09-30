import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  FileText,
  ShieldCheck,
  Zap,
  Layers,
  Database,
  Lock,
  ChevronDown,
  ChevronUp,
  Cpu,
  GraduationCap,
  Scale,
  Briefcase
} from 'lucide-react';

interface LandingPageProps {
  onStartChat: () => void;
  onExploreDocuments: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartChat,
  onExploreDocuments,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  };

  const steps = [
    {
      num: '01',
      title: 'Understand',
      desc: 'Deep multi-page PDF ingestion with page boundary mapping and semantic chunk extraction.',
    },
    {
      num: '02',
      title: 'Retrieve',
      desc: 'Sub-second dense vector similarity search in ChromaDB using MiniLM 384-dimensional embeddings.',
    },
    {
      num: '03',
      title: 'Reason',
      desc: 'Context-conditioned synthesis across single or multiple documents simultaneously.',
    },
    {
      num: '04',
      title: 'Verify',
      desc: 'Strict anti-hallucination guardrails enforce exact page-level provenance for every statement.',
    },
    {
      num: '05',
      title: 'Answer',
      desc: 'Clean, structured markdown responses with interactive citation badges linking to exact PDF pages.',
    },
  ];

  const features = [
    {
      icon: FileText,
      title: 'Page-Accurate Grounding',
      desc: 'Never wonder where an answer came from. Every key point links directly to its source page in your PDF.',
    },
    {
      icon: Database,
      title: 'ChromaDB Dense Vectors',
      desc: 'Blazing fast similarity search with persistent local vector embeddings that respect document boundaries.',
    },
    {
      icon: ShieldCheck,
      title: 'Zero Hallucination Guard',
      desc: 'System prompts strictly instruct the engine to decline unsupported answers rather than invent facts.',
    },
    {
      icon: Layers,
      title: 'Multi-Document Intelligence',
      desc: 'Cross-reference and compare concepts across your entire library or target a single specific chapter.',
    },
    {
      icon: Zap,
      title: 'Real-Time Streaming SSE',
      desc: 'Instant streaming tokens over Server-Sent Events with background persistent conversation history.',
    },
    {
      icon: Cpu,
      title: 'Smart Study & Synthesis Tools',
      desc: 'Generate executive summaries, Cornell notes, MCQs, and concept flashcards at the click of a button.',
    },
  ];

  const useCases = [
    {
      icon: GraduationCap,
      title: 'Higher Education & Study',
      desc: 'Upload 500-page textbooks and academic lecture notes. Ask for explanations in simple terms, test yourself with auto-generated MCQs, and cite exact textbook pages for exams.',
    },
    {
      icon: Scale,
      title: 'Legal & Regulatory Compliance',
      desc: 'Analyze agreements, policy documents, and statutory frameworks. Quickly trace clauses to precise page citations without reading hundreds of pages manually.',
    },
    {
      icon: Briefcase,
      title: 'Engineering & Technical Docs',
      desc: 'Search architectural blueprints, SDK manuals, and research papers. Retrieve code snippets, schemas, and operational instructions with verified accuracy.',
    },
  ];

  const faqs = [
    {
      q: 'How does KnowFlow AI ensure answers are accurate and not hallucinated?',
      a: 'KnowFlow AI uses a strict Retrieval-Augmented Generation (RAG) architecture. Before generating an answer, it queries the local ChromaDB vector store for relevant excerpts. The LLM is instructed with anti-hallucination guardrails to formulate answers using only the provided excerpts, with exact page citations.',
    },
    {
      q: 'What types of documents are supported?',
      a: 'Currently KnowFlow AI specializes in multi-page PDF documents of any size. Text is extracted with 1-indexed page preservation and vectorized into dense embeddings.',
    },
    {
      q: 'Does it support multi-document queries?',
      a: 'Yes. You can configure the chat scope to query your entire library, compare two documents, or target a single document or chapter.',
    },
    {
      q: 'Can I inspect the original PDF pages?',
      a: 'Yes! Clicking any citation chip opens a lightweight modal showing the exact excerpt snippet and provides a direct "Open PDF" button that takes you straight to that page.',
    },
    {
      q: 'Where are my documents stored?',
      a: 'Documents are processed and stored locally on your machine, with vectors indexed in a local ChromaDB database and metadata tracked in SQLite.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#080d1a] text-slate-900 dark:text-slate-100">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold mb-6 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span>KnowFlow AI • RAG v1.0 Document Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
          Your documents. <br />
          Your knowledge. <br />
          <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-500 bg-clip-text text-transparent">
            One intelligent workspace.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Upload documents, ask questions, and get answers grounded strictly in your sources with exact page citations and zero hallucination.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onStartChat}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <span>Try KnowFlow AI</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onExploreDocuments}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-750 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-brand-500" />
            <span>Explore Documents</span>
          </button>
        </div>
      </div>

      {/* How it Works Pipeline */}
      <div className="max-w-5xl mx-auto px-6 py-16 border-t border-slate-100 dark:border-slate-850">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
            The Knowledge Pipeline
          </h2>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            How KnowFlow AI Works
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between"
            >
              <div>
                <span className="text-2xl font-mono font-extrabold text-brand-500/30 dark:text-brand-400/30">
                  {s.num}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2 mb-1.5">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto px-6 py-16 border-t border-slate-100 dark:border-slate-850">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
            Platform Capabilities
          </h2>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Architected for High-Trust Document Intelligence
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* RAG Architecture Section */}
      <div className="max-w-5xl mx-auto px-6 py-16 border-t border-slate-100 dark:border-slate-850">
        <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-50 to-brand-50/30 dark:from-slate-900/60 dark:to-brand-950/20 border border-slate-200 dark:border-slate-800">
          <div className="max-w-2xl mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
              Engineering Architecture
            </h2>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Production-Grade RAG Stack
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              KnowFlow AI pairs PyMuPDF page-aware parsing with ONNX-accelerated MiniLM embeddings, persisted in an on-premise ChromaDB vector store and orchestrated through FastAPI streaming SSE.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-850/80 border border-slate-200/80 dark:border-slate-750">
              <span className="text-[10px] uppercase font-bold text-slate-400">Embedding Dim</span>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">384 Dense</p>
              <span className="text-[11px] text-slate-400">MiniLM-L6-v2</span>
            </div>
            <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-850/80 border border-slate-200/80 dark:border-slate-750">
              <span className="text-[10px] uppercase font-bold text-slate-400">Vector Engine</span>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">ChromaDB</p>
              <span className="text-[11px] text-slate-400">Cosine Similarity</span>
            </div>
            <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-850/80 border border-slate-200/80 dark:border-slate-750">
              <span className="text-[10px] uppercase font-bold text-slate-400">Chunk Strategy</span>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">1200 / 200</p>
              <span className="text-[11px] text-slate-400">Page-bound overlap</span>
            </div>
            <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-850/80 border border-slate-200/80 dark:border-slate-750">
              <span className="text-[10px] uppercase font-bold text-slate-400">Interface</span>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">React 19 + SSE</p>
              <span className="text-[11px] text-slate-400">Real-time tokens</span>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="max-w-5xl mx-auto px-6 py-16 border-t border-slate-100 dark:border-slate-850">
        <div className="text-center mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
            Real-World Impact
          </h2>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tailored for High-Volume Reading
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {useCases.map((uc, idx) => {
            const Icon = uc.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {uc.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {uc.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security & Privacy */}
      <div className="max-w-5xl mx-auto px-6 py-16 border-t border-slate-100 dark:border-slate-850">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
              <Lock className="w-4 h-4" />
              <span>Private & Grounded</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Your Data Stays Yours
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Documents are processed in your private database and vector store. Vector embeddings never leak across unauthorized scopes. Queries only access the specific documents you select.
            </p>
          </div>
          <button
            onClick={onStartChat}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            Launch Workspace
          </button>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="max-w-3xl mx-auto px-6 py-16 border-t border-slate-100 dark:border-slate-850">
        <div className="text-center mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Common Questions
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-850 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-10 text-center text-xs text-slate-400">
        <div className="flex items-center justify-center gap-2 mb-2 font-semibold text-slate-600 dark:text-slate-300">
          <Sparkles className="w-4 h-4 text-brand-500" />
          <span>KnowFlow AI • Document Intelligence Platform</span>
        </div>
        <p>© 2026 KnowFlow AI. Grounded RAG Architecture.</p>
      </footer>
    </div>
  );
};
