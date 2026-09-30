from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict

# Health Check
class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    database_ok: bool
    chroma_ok: bool

# Source Citations
class SourceCitation(BaseModel):
    document_id: str
    document_name: str
    page_number: int
    page_end: Optional[int] = None
    chunk_id: str
    snippet: str
    score: float = 0.0
    section: Optional[str] = None

# Document Schemas
class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_name: str
    file_size: int
    page_count: int
    chunk_count: int
    status: str
    progress: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentStatusResponse(BaseModel):
    id: str
    status: str
    progress: int
    page_count: int
    chunk_count: int
    error_message: Optional[str] = None

class DocumentListResponse(BaseModel):
    total: int
    documents: List[DocumentResponse]

# Chat Schemas
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's query")
    conversation_id: Optional[str] = None
    document_scope: str = "all"  # "all", "single", "selected"
    selected_document_ids: Optional[List[str]] = None
    top_k: Optional[int] = None
    temperature: Optional[float] = None
    model: Optional[str] = None
    provider: Optional[str] = "openrouter"  # "openrouter", "ollama", "local"

class ChatResponse(BaseModel):
    answer: str
    conversation_id: str
    message_id: str
    sources: List[SourceCitation] = []
    model: str
    mode: str = "document"
    document_support: str = "full"
    provider: Optional[str] = "openrouter"
    created_at: datetime

# Message & Conversation Schemas
class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    sources: List[SourceCitation] = []
    mode: Optional[str] = "document"
    document_support: Optional[str] = "full"
    provider: Optional[str] = "openrouter"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConversationResponse(BaseModel):
    id: str
    title: str
    document_scope: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class ConversationDetailResponse(BaseModel):
    id: str
    title: str
    document_scope: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse]

    model_config = ConfigDict(from_attributes=True)

class ConversationUpdateTitle(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)

# Study Feature Schemas
class StudyRequest(BaseModel):
    document_id: Optional[str] = None
    selected_document_ids: Optional[List[str]] = None
    topic: Optional[str] = None
    model: Optional[str] = None

class StudySummaryResponse(BaseModel):
    topic_or_document: str
    executive_summary: str
    key_takeaways: List[str]
    citations: List[SourceCitation] = []

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    page_reference: Optional[int] = None

class StudyQuizResponse(BaseModel):
    topic_or_document: str
    questions: List[QuizQuestion]
    citations: List[SourceCitation] = []

class ConceptItem(BaseModel):
    term: str
    definition: str
    simple_explanation: str
    page_reference: Optional[int] = None

class StudyConceptsResponse(BaseModel):
    topic_or_document: str
    concepts: List[ConceptItem]
    citations: List[SourceCitation] = []

class StudyNotesResponse(BaseModel):
    topic_or_document: str
    notes_markdown: str
    citations: List[SourceCitation] = []
