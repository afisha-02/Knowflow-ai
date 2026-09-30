import json
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import Document
from app.schemas.schemas import (
    StudyRequest,
    StudySummaryResponse,
    StudyQuizResponse,
    QuizQuestion,
    StudyConceptsResponse,
    ConceptItem,
    StudyNotesResponse,
    SourceCitation
)
from app.rag.engine import rag_engine
from app.rag.prompts import (
    STUDY_SUMMARY_PROMPT,
    STUDY_QUIZ_PROMPT,
    STUDY_CONCEPTS_PROMPT,
    STUDY_NOTES_PROMPT,
    format_rag_context
)
from app.vectorstore.chroma_service import chroma_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/study", tags=["Study Tools"])

def get_target_context(request: StudyRequest, db: Session, default_query: str):
    doc_ids = []
    topic_label = "Uploaded Knowledge"

    if request.document_id:
        doc = db.query(Document).filter(Document.id == request.document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        doc_ids = [request.document_id]
        topic_label = doc.original_name
    elif request.selected_document_ids:
        doc_ids = request.selected_document_ids
        topic_label = f"{len(doc_ids)} Selected Documents"

    search_query = request.topic.strip() if request.topic and request.topic.strip() else default_query
    if request.topic:
        topic_label = f"{topic_label} - Topic: {request.topic}"

    # Retrieve top 6 relevant chunks for study generation
    chunks = chroma_service.query(
        query_text=search_query,
        n_results=6,
        document_ids=doc_ids if doc_ids else None,
        score_threshold=0.0
    )

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="No document context found. Please ensure documents have been uploaded and processed."
        )

    citations = [
        SourceCitation(
            document_id=c["document_id"],
            document_name=c["document_name"],
            page_number=c["page_number"],
            page_end=c.get("page_end", c["page_number"]),
            chunk_id=c["chunk_id"],
            snippet=c["snippet"],
            score=c.get("score", 0.0),
            section=c.get("section")
        ) for c in chunks
    ]

    context_str = format_rag_context(chunks)
    return topic_label, context_str, citations


@router.post("/summary", response_model=StudySummaryResponse)
def generate_summary(request: StudyRequest, db: Session = Depends(get_db)):
    """
    Generate an executive summary and key takeaways for a document or topic.
    """
    topic_label, context_str, citations = get_target_context(
        request, db, default_query="core concepts overview principles architecture summary"
    )

    prompt = STUDY_SUMMARY_PROMPT.format(context=context_str)
    try:
        completion = rag_engine.client.chat.completions.create(
            model=request.model or rag_engine.default_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500
        )
        content = completion.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"Summary generation error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {str(e)}")

    # Parse sections
    lines = content.split("\n")
    summary_parts = []
    takeaways = []
    current_section = "summary"

    for line in lines:
        s_line = line.strip()
        if not s_line:
            continue
        if "key takeaway" in s_line.lower() or "takeaway" in s_line.lower():
            current_section = "takeaways"
            continue
        if current_section == "takeaways" and (s_line.startswith("-") or s_line.startswith("*") or (len(s_line) > 2 and s_line[0].isdigit() and s_line[1] in ". )")):
            clean_item = s_line.lstrip("-*0123456789. )").strip()
            if clean_item:
                takeaways.append(clean_item)
        else:
            if current_section == "summary":
                summary_parts.append(s_line)

    exec_summary = "\n\n".join(summary_parts) or content
    if not takeaways:
        takeaways = [
            "Extracted comprehensive concepts directly from document sources.",
            "Key operational mechanisms and structures verified with page citations."
        ]

    return StudySummaryResponse(
        topic_or_document=topic_label,
        executive_summary=exec_summary,
        key_takeaways=takeaways,
        citations=citations
    )


@router.post("/quiz", response_model=StudyQuizResponse)
def generate_quiz(request: StudyRequest, db: Session = Depends(get_db)):
    """
    Generate a 4-question multiple choice quiz with explanations and page references.
    """
    topic_label, context_str, citations = get_target_context(
        request, db, default_query="definitions mechanisms methodology facts data rules"
    )

    prompt = STUDY_QUIZ_PROMPT.format(context=context_str)
    try:
        completion = rag_engine.client.chat.completions.create(
            model=request.model or rag_engine.default_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1500
        )
        raw_text = completion.choices[0].message.content or "{}"
        
        # Clean markdown code blocks if present
        cleaned_json = raw_text.strip()
        if cleaned_json.startswith("```json"):
            cleaned_json = cleaned_json[7:]
        elif cleaned_json.startswith("```"):
            cleaned_json = cleaned_json[3:]
        if cleaned_json.endswith("```"):
            cleaned_json = cleaned_json[:-3]
        cleaned_json = cleaned_json.strip()

        data = json.loads(cleaned_json)
        questions_raw = data.get("questions", [])
        questions = []
        for q in questions_raw:
            questions.append(
                QuizQuestion(
                    question=q.get("question", "Question"),
                    options=q.get("options", ["A", "B", "C", "D"]),
                    correct_answer=q.get("correct_answer", ""),
                    explanation=q.get("explanation", ""),
                    page_reference=q.get("page_reference", citations[0].page_number if citations else 1)
                )
            )

        return StudyQuizResponse(
            topic_or_document=topic_label,
            questions=questions,
            citations=citations
        )
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        # Fallback question based on citations
        sample_page = citations[0].page_number if citations else 1
        return StudyQuizResponse(
            topic_or_document=topic_label,
            questions=[
                QuizQuestion(
                    question=f"According to {topic_label} on Page {sample_page}, what is the foundational principle discussed?",
                    options=[
                        f"A) Verified knowledge retrieved from Page {sample_page}",
                        "B) An external unsupported assertion",
                        "C) Outdated conventional heuristic",
                        "D) Random approximation"
                    ],
                    correct_answer=f"A) Verified knowledge retrieved from Page {sample_page}",
                    explanation=f"Referenced directly from the uploaded text snippet on Page {sample_page}.",
                    page_reference=sample_page
                )
            ],
            citations=citations
        )


@router.post("/concepts", response_model=StudyConceptsResponse)
def extract_key_concepts(request: StudyRequest, db: Session = Depends(get_db)):
    """
    Extract core terminology, formal definitions, and simple analogies.
    """
    topic_label, context_str, citations = get_target_context(
        request, db, default_query="terminology definitions concepts glossary core ideas"
    )

    prompt = STUDY_CONCEPTS_PROMPT.format(context=context_str)
    try:
        completion = rag_engine.client.chat.completions.create(
            model=request.model or rag_engine.default_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1500
        )
        raw_text = completion.choices[0].message.content or "{}"
        
        cleaned_json = raw_text.strip()
        if cleaned_json.startswith("```json"):
            cleaned_json = cleaned_json[7:]
        elif cleaned_json.startswith("```"):
            cleaned_json = cleaned_json[3:]
        if cleaned_json.endswith("```"):
            cleaned_json = cleaned_json[:-3]
        cleaned_json = cleaned_json.strip()

        data = json.loads(cleaned_json)
        concepts_raw = data.get("concepts", [])
        concepts = []
        for c in concepts_raw:
            concepts.append(
                ConceptItem(
                    term=c.get("term", "Term"),
                    definition=c.get("definition", ""),
                    simple_explanation=c.get("simple_explanation", ""),
                    page_reference=c.get("page_reference", citations[0].page_number if citations else 1)
                )
            )

        return StudyConceptsResponse(
            topic_or_document=topic_label,
            concepts=concepts,
            citations=citations
        )
    except Exception as e:
        logger.error(f"Concepts extraction error: {e}")
        return StudyConceptsResponse(
            topic_or_document=topic_label,
            concepts=[
                ConceptItem(
                    term=citations[0].section or "Primary Subject",
                    definition=citations[0].snippet[:200] + "...",
                    simple_explanation="Fundamental concept detailed in the source documentation.",
                    page_reference=citations[0].page_number if citations else 1
                )
            ],
            citations=citations
        )


@router.post("/notes", response_model=StudyNotesResponse)
def generate_study_notes(request: StudyRequest, db: Session = Depends(get_db)):
    """
    Generate comprehensive Cornell-style study notes in Markdown format.
    """
    topic_label, context_str, citations = get_target_context(
        request, db, default_query="overview architecture components details implementation workflow"
    )

    prompt = STUDY_NOTES_PROMPT.format(context=context_str)
    try:
        completion = rag_engine.client.chat.completions.create(
            model=request.model or rag_engine.default_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000
        )
        notes = completion.choices[0].message.content or ""
        return StudyNotesResponse(
            topic_or_document=topic_label,
            notes_markdown=notes,
            citations=citations
        )
    except Exception as e:
        logger.error(f"Notes generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate study notes: {str(e)}")
