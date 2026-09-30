export interface DocumentItem {
  id: string;
  filename: string;
  original_name: string;
  file_size: number;
  page_count: number;
  chunk_count: number;
  status: 'UPLOADING' | 'EXTRACTING' | 'CHUNKING' | 'EMBEDDING' | 'INDEXING' | 'COMPLETED' | 'FAILED';
  progress: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceCitation {
  document_id: string;
  document_name: string;
  page_number: number;
  page_end?: number | null;
  chunk_id: string;
  snippet: string;
  score: number;
  section?: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SourceCitation[];
  mode?: 'document' | 'general' | 'mixed';
  document_support?: 'full' | 'partial' | 'none';
  provider?: 'openrouter' | 'ollama' | 'local';
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  document_scope: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  provider: 'openrouter' | 'ollama' | 'local';
  model: string;
  ollama_url: string;
  ollama_model: string;
  top_k: number;
  temperature: number;
  showScores: boolean;
}

export interface StudySummary {
  topic_or_document: string;
  executive_summary: string;
  key_takeaways: string[];
  citations: SourceCitation[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  page_reference?: number;
}

export interface StudyQuiz {
  topic_or_document: string;
  questions: QuizQuestion[];
  citations: SourceCitation[];
}

export interface ConceptItem {
  term: string;
  definition: string;
  simple_explanation: string;
  page_reference?: number;
}

export interface StudyConcepts {
  topic_or_document: string;
  concepts: ConceptItem[];
  citations: SourceCitation[];
}

export interface StudyNotes {
  topic_or_document: string;
  notes_markdown: string;
  citations: SourceCitation[];
}
