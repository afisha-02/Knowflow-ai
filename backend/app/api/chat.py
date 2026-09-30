import json
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.connection import get_db, SessionLocal
from app.database.models import Conversation, Message
from app.schemas.schemas import ChatRequest, ChatResponse, SourceCitation
from app.core.security import generate_id
from app.rag.engine import rag_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])

def get_or_create_conversation(db: Session, conversation_id: Optional[str], title_seed: str, scope: str) -> Conversation:
    if conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv:
            return conv

    # Generate new conversation
    cid = generate_id("conv")
    # Title is first 40 chars of query
    clean_title = title_seed.strip()[:45] + ("..." if len(title_seed.strip()) > 45 else "")
    new_conv = Conversation(
        id=cid,
        title=clean_title or "New Knowledge Chat",
        document_scope=scope
    )
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    return new_conv

@router.post("", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Standard synchronous grounded RAG chat endpoint.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    conv = get_or_create_conversation(db, request.conversation_id, request.message, request.document_scope)

    # Fetch recent message history
    history_records = db.query(Message).filter(
        Message.conversation_id == conv.id
    ).order_by(Message.created_at.asc()).limit(8).all()

    history = [{"role": m.role, "content": m.content} for m in history_records]

    # Save user message
    user_msg_id = generate_id("msg")
    user_msg = Message(
        id=user_msg_id,
        conversation_id=conv.id,
        role="user",
        content=request.message
    )
    db.add(user_msg)
    db.commit()

    # Determine document filter
    filter_ids = None
    if request.document_scope == "single" and request.selected_document_ids:
        filter_ids = [request.selected_document_ids[0]]
    elif request.document_scope == "selected" and request.selected_document_ids:
        filter_ids = request.selected_document_ids

    # Generate answer
    rag_result = rag_engine.generate_answer(
        query=request.message,
        document_ids=filter_ids,
        conversation_history=history,
        top_k=request.top_k,
        temperature=request.temperature,
        model_name=request.model,
        provider=request.provider or "openrouter"
    )

    answer_text = rag_result["answer"]
    raw_sources = rag_result["sources"]
    used_model = rag_result["model"]
    used_provider = rag_result.get("provider", request.provider or "openrouter")

    citations = [
        SourceCitation(
            document_id=s["document_id"],
            document_name=s["document_name"],
            page_number=s["page_number"],
            page_end=s.get("page_end", s["page_number"]),
            chunk_id=s["chunk_id"],
            snippet=s["snippet"],
            score=s.get("score", 0.0),
            section=s.get("section")
        ) for s in raw_sources
    ]

    mode_val = rag_result.get("mode", "document")
    support_val = rag_result.get("document_support", "full")

    # Save assistant message
    asst_msg_id = generate_id("msg")
    asst_msg = Message(
        id=asst_msg_id,
        conversation_id=conv.id,
        role="assistant",
        content=answer_text,
        sources_json=json.dumps([c.model_dump() for c in citations]),
        mode=mode_val,
        document_support=support_val,
        provider=used_provider
    )
    db.add(asst_msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()

    return ChatResponse(
        answer=answer_text,
        conversation_id=conv.id,
        message_id=asst_msg_id,
        sources=citations,
        model=used_model,
        mode=mode_val,
        document_support=support_val,
        provider=used_provider,
        created_at=asst_msg.created_at
    )


@router.post("/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """
    Streaming Server-Sent Events (SSE) chat endpoint.
    Streams answer tokens in real-time.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    db = SessionLocal()
    try:
        conv = get_or_create_conversation(db, request.conversation_id, request.message, request.document_scope)
        conv_id = conv.id

        history_records = db.query(Message).filter(
            Message.conversation_id == conv_id
        ).order_by(Message.created_at.asc()).limit(8).all()
        history = [{"role": m.role, "content": m.content} for m in history_records]

        # Save user message
        user_msg = Message(
            id=generate_id("msg"),
            conversation_id=conv_id,
            role="user",
            content=request.message
        )
        db.add(user_msg)
        db.commit()

        # Determine document filter
        filter_ids = None
        if request.document_scope == "single" and request.selected_document_ids:
            filter_ids = [request.selected_document_ids[0]]
        elif request.document_scope == "selected" and request.selected_document_ids:
            filter_ids = request.selected_document_ids
    finally:
        db.close()

    async def event_generator():
        accumulated_text = []
        captured_sources = []
        model_used = "system"
        detected_mode = "document"
        detected_support = "full"

        # Emit conversation_id first
        yield f"data: {json.dumps({'event': 'session', 'conversation_id': conv_id})}\n\n"

        provider_used = request.provider or "openrouter"

        async for chunk in rag_engine.stream_answer(
            query=request.message,
            document_ids=filter_ids,
            conversation_history=history,
            top_k=request.top_k,
            temperature=request.temperature,
            model_name=request.model,
            provider=request.provider or "openrouter"
        ):
            # Parse internal event to capture text
            try:
                line = chunk.replace("data: ", "").strip()
                if line:
                    ev = json.loads(line)
                    if ev.get("event") == "token":
                        accumulated_text.append(ev.get("token", ""))
                    elif ev.get("event") == "sources":
                        captured_sources = ev.get("sources", [])
                        if "mode" in ev:
                            detected_mode = ev["mode"]
                        if "document_support" in ev:
                            detected_support = ev["document_support"]
                    elif ev.get("event") == "done":
                        model_used = ev.get("model", "openrouter")
                        if "provider" in ev:
                            provider_used = ev["provider"]
                        if "mode" in ev:
                            detected_mode = ev["mode"]
                        if "document_support" in ev:
                            detected_support = ev["document_support"]
            except Exception:
                pass
            yield chunk

        # Save assistant message in DB
        save_db = SessionLocal()
        try:
            full_answer = "".join(accumulated_text)
            asst_msg = Message(
                id=generate_id("msg"),
                conversation_id=conv_id,
                role="assistant",
                content=full_answer,
                sources_json=json.dumps(captured_sources),
                mode=detected_mode,
                document_support=detected_support,
                provider=provider_used
            )
            save_db.add(asst_msg)
            c_record = save_db.query(Conversation).filter(Conversation.id == conv_id).first()
            if c_record:
                c_record.updated_at = datetime.now(timezone.utc)
            save_db.commit()
        except Exception as e:
            logger.error(f"Failed to persist stream message to DB: {e}")
        finally:
            save_db.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
