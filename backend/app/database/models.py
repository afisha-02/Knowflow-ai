from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def utc_now():
    return datetime.now(timezone.utc)

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, default=0)
    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    status = Column(String(32), default="UPLOADING", index=True)  # UPLOADING, EXTRACTING, CHUNKING, EMBEDDING, INDEXING, COMPLETED, FAILED
    progress = Column(Integer, default=0)  # 0 - 100
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), default="New Knowledge Chat")
    document_scope = Column(String(512), default="all")  # "all" or specific document_id or list
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(64), primary_key=True, index=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(32), nullable=False)  # "user", "assistant", "system"
    content = Column(Text, nullable=False)
    sources_json = Column(Text, nullable=True)  # JSON string of retrieved sources
    mode = Column(String(32), default="document", nullable=True)
    document_support = Column(String(32), default="full", nullable=True)
    provider = Column(String(32), default="openrouter", nullable=True)
    created_at = Column(DateTime, default=utc_now)

    conversation = relationship("Conversation", back_populates="messages")
