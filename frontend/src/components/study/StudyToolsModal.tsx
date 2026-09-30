import React, { useState } from 'react';
import {
  GraduationCap,
  FileText,
  HelpCircle,
  BookOpen,
  ListOrdered,
  Sparkles,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Search
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { DocumentItem, StudySummary, StudyQuiz, StudyConcepts, StudyNotes } from '../../types';
import { api } from '../../services/api';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

interface StudyToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  preselectedDocId?: string | null;
}

export const StudyToolsModal: React.FC<StudyToolsModalProps> = ({
  isOpen,
  onClose,
  documents,
  preselectedDocId,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'quiz' | 'concepts' | 'notes'>('summary');
  const [selectedDocId, setSelectedDocId] = useState<string>(preselectedDocId || documents[0]?.id || '');
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results state
  const [summaryData, setSummaryData] = useState<StudySummary | null>(null);
  const [quizData, setQuizData] = useState<StudyQuiz | null>(null);
  const [conceptsData, setConceptsData] = useState<StudyConcepts | null>(null);
  const [notesData, setNotesData] = useState<StudyNotes | null>(null);

  // Interactive quiz state: questionIndex -> selectedOption
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [copiedNotes, setCopiedNotes] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        document_id: selectedDocId || undefined,
        topic: topic.trim() || undefined,
      };

      if (activeTab === 'summary') {
        const res = await api.getStudySummary(payload);
        setSummaryData(res);
      } else if (activeTab === 'quiz') {
        const res = await api.getStudyQuiz(payload);
        setQuizData(res);
        setQuizAnswers({});
      } else if (activeTab === 'concepts') {
        const res = await api.getStudyConcepts(payload);
        setConceptsData(res);
      } else if (activeTab === 'notes') {
        const res = await api.getStudyNotes(payload);
        setNotesData(res);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate study content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyNotes = () => {
    if (notesData?.notes_markdown) {
      navigator.clipboard.writeText(notesData.notes_markdown);
      setCopiedNotes(true);
      setTimeout(() => setCopiedNotes(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title={
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <span>KnowFlow AI Study Station</span>
        </div>
      }
      description="Transform document context into executive summaries, practice quizzes, flash concepts, and Cornell notes."
    >
      <div className="space-y-6">
        {/* Controls: Select Document & Topic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Source Document
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Documents in Knowledge Base</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.original_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Topic or Focus Area (Optional)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="e.g., Optimization, Chapter 2, Neural Nets..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
          {[
            { id: 'summary', label: 'Summary', icon: FileText },
            { id: 'quiz', label: 'Practice Quiz', icon: HelpCircle },
            { id: 'concepts', label: 'Key Concepts', icon: BookOpen },
            { id: 'notes', label: 'Cornell Notes', icon: ListOrdered },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  isActive
                    ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            isLoading={isLoading}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Generate {activeTab === 'summary' ? 'Summary' : activeTab === 'quiz' ? 'Quiz' : activeTab === 'concepts' ? 'Concepts' : 'Notes'}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Content Area */}
        <div className="min-h-[220px]">
          {/* 1. Summary Tab */}
          {activeTab === 'summary' && (
            summaryData ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Executive Summary</h4>
                  <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                    {summaryData.executive_summary}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Takeaways</h4>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {summaryData.key_takeaways.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Click "Generate Summary" to extract executive summaries from your document.
              </div>
            )
          )}

          {/* 2. Practice Quiz Tab */}
          {activeTab === 'quiz' && (
            quizData ? (
              <div className="space-y-4">
                {quizData.questions.map((q, qIdx) => {
                  const userAnswer = quizAnswers[qIdx];
                  const hasAnswered = !!userAnswer;
                  const isCorrect = userAnswer === q.correct_answer;

                  return (
                    <div
                      key={qIdx}
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {qIdx + 1}. {q.question}
                        </h4>
                        {q.page_reference && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 shrink-0 border border-brand-200 dark:border-brand-800">
                            Page {q.page_reference}
                          </span>
                        )}
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isOptionSelected = userAnswer === opt;
                          const isOptionCorrect = opt === q.correct_answer;

                          let btnStyle = 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200';
                          if (hasAnswered) {
                            if (isOptionCorrect) {
                              btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold';
                            } else if (isOptionSelected && !isOptionCorrect) {
                              btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 font-semibold';
                            } else {
                              btnStyle = 'opacity-50 border-slate-200 dark:border-slate-800 text-slate-400';
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                if (!hasAnswered) {
                                  setQuizAnswers({ ...quizAnswers, [qIdx]: opt });
                                }
                              }}
                              className={`p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {hasAnswered && isOptionCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              )}
                              {hasAnswered && isOptionSelected && !isOptionCorrect && (
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Feedback & Explanation */}
                      {hasAnswered && (
                        <div
                          className={`p-3 rounded-lg text-xs leading-relaxed ${
                            isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          <p className="font-semibold mb-1">
                            {isCorrect ? '✓ Correct Answer!' : `✗ Incorrect. Correct: ${q.correct_answer}`}
                          </p>
                          <p>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Click "Generate Quiz" to test your comprehension with interactive questions.
              </div>
            )
          )}

          {/* 3. Key Concepts Tab */}
          {activeTab === 'concepts' && (
            conceptsData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {conceptsData.concepts.map((c, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                        {c.term}
                      </span>
                      {c.page_reference && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          Page {c.page_reference}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {c.definition}
                    </p>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-850">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        💡 Simply put: {c.simple_explanation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Click "Generate Concepts" to extract definitions and simplified analogies.
              </div>
            )
          )}

          {/* 4. Cornell Notes Tab */}
          {activeTab === 'notes' && (
            notesData ? (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={handleCopyNotes}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    {copiedNotes ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied Markdown</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-96 overflow-y-auto">
                  <MarkdownRenderer content={notesData.notes_markdown} />
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Click "Generate Notes" to produce structured, exportable Cornell-style study notes.
              </div>
            )
          )}
        </div>
      </div>
    </Modal>
  );
};
