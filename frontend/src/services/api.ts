import {
  DocumentItem,
  Conversation,
  Message,
  SourceCitation,
  StudySummary,
  StudyQuiz,
  StudyConcepts,
  StudyNotes
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = {
  // Health
  async getHealth(): Promise<{ status: string; database_ok: boolean; chroma_ok: boolean }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch backend health status');
    return res.json();
  },

  // Documents
  async getDocuments(search?: string): Promise<{ total: number; documents: DocumentItem[] }> {
    const url = new URL(`${API_BASE}/documents`);
    if (search) url.searchParams.append('search', search);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to load documents');
    return res.json();
  },

  async uploadDocument(file: File): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload document' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async getDocumentStatus(id: string): Promise<{
    id: string;
    status: DocumentItem['status'];
    progress: number;
    page_count: number;
    chunk_count: number;
    error_message?: string | null;
  }> {
    const res = await fetch(`${API_BASE}/documents/${id}/status`);
    if (!res.ok) throw new Error('Failed to fetch document status');
    return res.json();
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  getDocumentFileUrl(id: string): string {
    return `${API_BASE}/documents/${id}/file`;
  },

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/conversations`);
    if (!res.ok) throw new Error('Failed to load conversations');
    return res.json();
  },

  async getConversation(id: string): Promise<Conversation & { messages: Message[] }> {
    const res = await fetch(`${API_BASE}/conversations/${id}`);
    if (!res.ok) throw new Error('Failed to load conversation messages');
    return res.json();
  },

  async renameConversation(id: string, title: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/${id}/title`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to rename conversation');
    return res.json();
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete conversation');
  },

  // Chat
  async sendChatMessage(payload: {
    message: string;
    conversation_id?: string | null;
    document_scope?: string;
    selected_document_ids?: string[];
    top_k?: number;
    temperature?: number;
    model?: string;
    provider?: string;
  }): Promise<{
    answer: string;
    conversation_id: string;
    message_id: string;
    sources: SourceCitation[];
    model: string;
    mode?: 'document' | 'general' | 'mixed';
    document_support?: 'full' | 'partial' | 'none';
    provider?: 'openrouter' | 'ollama' | 'local';
  }> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Chat request failed' }));
      throw new Error(err.detail || 'Failed to send message');
    }
    return res.json();
  },

  // Streaming Chat via SSE
  async sendChatStream(
    payload: {
      message: string;
      conversation_id?: string | null;
      document_scope?: string;
      selected_document_ids?: string[];
      top_k?: number;
      temperature?: number;
      model?: string;
      provider?: string;
    },
    callbacks: {
      onSession?: (convId: string) => void;
      onSources?: (sources: SourceCitation[], mode?: string, documentSupport?: string) => void;
      onToken?: (token: string) => void;
      onDone?: (model: string, mode?: string, documentSupport?: string, provider?: 'openrouter' | 'ollama' | 'local') => void;
      onError?: (err: Error) => void;
    },
    signal?: AbortSignal
  ): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Stream request failed' }));
        throw new Error(err.detail || 'Streaming failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable stream available');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(trimmed.replace('data: ', ''));
            if (data.event === 'session' && callbacks.onSession) {
              callbacks.onSession(data.conversation_id);
            } else if (data.event === 'sources' && callbacks.onSources) {
              callbacks.onSources(data.sources || [], data.mode, data.document_support);
            } else if (data.event === 'token' && callbacks.onToken) {
              callbacks.onToken(data.token || '');
            } else if (data.event === 'done' && callbacks.onDone) {
              callbacks.onDone(data.model || 'openrouter', data.mode, data.document_support, data.provider || 'openrouter');
            }
          } catch (e) {
            console.error('Failed to parse SSE line:', line, e);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && callbacks.onError) {
        callbacks.onError(err);
      }
    }
  },

  // Study Tools
  async getStudySummary(payload: {
    document_id?: string;
    selected_document_ids?: string[];
    topic?: string;
    model?: string;
  }): Promise<StudySummary> {
    const res = await fetch(`${API_BASE}/study/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to generate summary');
    return res.json();
  },

  async getStudyQuiz(payload: {
    document_id?: string;
    selected_document_ids?: string[];
    topic?: string;
    model?: string;
  }): Promise<StudyQuiz> {
    const res = await fetch(`${API_BASE}/study/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to generate quiz');
    return res.json();
  },

  async getStudyConcepts(payload: {
    document_id?: string;
    selected_document_ids?: string[];
    topic?: string;
    model?: string;
  }): Promise<StudyConcepts> {
    const res = await fetch(`${API_BASE}/study/concepts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to extract key concepts');
    return res.json();
  },

  async getStudyNotes(payload: {
    document_id?: string;
    selected_document_ids?: string[];
    topic?: string;
    model?: string;
  }): Promise<StudyNotes> {
    const res = await fetch(`${API_BASE}/study/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to generate study notes');
    return res.json();
  }
};
