import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import Conversation, Message
from app.schemas.schemas import (
    ConversationResponse,
    ConversationDetailResponse,
    ConversationUpdateTitle,
    MessageResponse,
    SourceCitation
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])

@router.get("", response_model=List[ConversationResponse])
def list_conversations(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """
    List all chat sessions ordered by most recently active.
    """
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).offset(skip).limit(limit).all()
    results = []
    for c in convs:
        count = db.query(Message).filter(Message.conversation_id == c.id).count()
        results.append(
            ConversationResponse(
                id=c.id,
                title=c.title,
                document_scope=c.document_scope,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=count
            )
        )
    return results


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """
    Get full conversation with all messages and source citations.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.asc()).all()

    formatted_messages = []
    for m in messages:
        sources_list = []
        if m.sources_json:
            try:
                raw_sources = json.loads(m.sources_json)
                for s in raw_sources:
                    sources_list.append(SourceCitation(**s))
            except Exception:
                pass

        formatted_messages.append(
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                sources=sources_list,
                mode=getattr(m, "mode", "document") or "document",
                document_support=getattr(m, "document_support", "full") or "full",
                provider=getattr(m, "provider", "openrouter") or "openrouter",
                created_at=m.created_at
            )
        )

    return ConversationDetailResponse(
        id=conv.id,
        title=conv.title,
        document_scope=conv.document_scope,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=formatted_messages
    )


@router.patch("/{conversation_id}/title", response_model=ConversationResponse)
def update_conversation_title(conversation_id: str, payload: ConversationUpdateTitle, db: Session = Depends(get_db)):
    """
    Rename conversation title.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.title = payload.title.strip()
    db.commit()
    db.refresh(conv)

    count = db.query(Message).filter(Message.conversation_id == conv.id).count()
    return ConversationResponse(
        id=conv.id,
        title=conv.title,
        document_scope=conv.document_scope,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=count
    )


@router.delete("/{conversation_id}")
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """
    Delete conversation session and all its messages.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.delete(conv)
    db.commit()
    return {"status": "success", "message": "Conversation deleted"}
