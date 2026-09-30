import os
import shutil
import logging
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import sanitize_filename, generate_id
from app.database.connection import get_db, SessionLocal
from app.database.models import Document
from app.schemas.schemas import DocumentResponse, DocumentStatusResponse, DocumentListResponse
from app.document_processing.pdf_extractor import extract_pdf_pages, PDFExtractionError
from app.document_processing.chunker import chunk_document_pages
from app.vectorstore.chroma_service import chroma_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])

def process_document_pipeline(document_id: str, file_path_str: str, original_name: str):
    """
    Background worker pipeline that processes, extracts, chunks, embeds, and indexes documents.
    Features incremental real-time progress updates and multi-format support.
    """
    db = SessionLocal()
    file_path = Path(file_path_str)
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Document {document_id} not found in DB during background processing")
            return

        # Phase 1: Extraction
        doc.status = "EXTRACTING"
        doc.progress = 25
        db.commit()
        logger.info(f"Extracting content from {original_name} (ID: {document_id})")
        
        pages_data = extract_pdf_pages(file_path)
        total_pages = len(pages_data)
        doc.page_count = total_pages
        doc.progress = 45
        db.commit()

        # Phase 2: Chunking
        doc.status = "CHUNKING"
        doc.progress = 55
        db.commit()
        logger.info(f"Chunking {total_pages} pages for {original_name}")
        
        chunks = chunk_document_pages(
            pages_data=pages_data,
            document_id=document_id,
            document_name=original_name,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )
        total_chunks = len(chunks)
        doc.chunk_count = total_chunks
        doc.progress = 65
        db.commit()

        # Phase 3: Embedding & Indexing
        doc.status = "EMBEDDING"
        db.commit()
        logger.info(f"Generating embeddings and indexing {total_chunks} chunks in ChromaDB")

        def on_embed_progress(added: int, total: int):
            try:
                prog_db = SessionLocal()
                p_doc = prog_db.query(Document).filter(Document.id == document_id).first()
                if p_doc:
                    frac = added / max(1, total)
                    p_doc.progress = min(95, 65 + int(frac * 30))
                    prog_db.commit()
                prog_db.close()
            except Exception:
                pass
        
        chroma_service.add_chunks(chunks, batch_size=40, on_progress=on_embed_progress)

        # Phase 4: Finalizing
        doc.status = "INDEXING"
        doc.progress = 98
        db.commit()

        doc.status = "COMPLETED"
        doc.progress = 100
        doc.error_message = None
        db.commit()
        logger.info(f"Document {original_name} (ID: {document_id}) successfully indexed!")

    except PDFExtractionError as pe:
        logger.error(f"Extraction failed for {document_id}: {pe}")
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "FAILED"
            doc.error_message = str(pe)
            db.commit()
    except Exception as e:
        logger.exception(f"Unexpected error processing document {document_id}: {e}")
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "FAILED"
            doc.error_message = f"Processing failed: {str(e)}"
            db.commit()
    finally:
        db.close()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a document (PDF, Word DOCX, Markdown, Text).
    Safely saves the file and begins background ingestion.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    original_name = file.filename
    clean_name = sanitize_filename(original_name)

    supported_extensions = {".pdf", ".docx", ".txt", ".md", ".csv", ".json"}
    ext = Path(clean_name).suffix.lower()

    if ext not in supported_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Supported formats: {', '.join(sorted(supported_extensions))}."
        )

    doc_id = generate_id("doc")
    stored_filename = f"{doc_id}_{clean_name}"
    save_path = (settings.UPLOAD_DIR / stored_filename).resolve()

    # Stream write to disk
    file_size = 0
    try:
        with open(save_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                buffer.write(chunk)
                file_size += len(chunk)
    except Exception as e:
        if save_path.exists():
            save_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    if file_size == 0:
        if save_path.exists():
            save_path.unlink()
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

    # Create database record
    new_doc = Document(
        id=doc_id,
        filename=stored_filename,
        original_name=original_name,
        file_path=str(save_path),
        file_size=file_size,
        page_count=0,
        chunk_count=0,
        status="UPLOADING",
        progress=10,
        error_message=None
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # Launch background extraction and indexing pipeline
    background_tasks.add_task(
        process_document_pipeline,
        document_id=doc_id,
        file_path_str=str(save_path),
        original_name=original_name
    )

    return new_doc


@router.get("", response_model=DocumentListResponse)
def list_documents(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all documents in the knowledge base with optional search filtering.
    """
    query = db.query(Document)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(Document.original_name.ilike(search_pattern))

    total = query.count()
    docs = query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "documents": docs}


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, db: Session = Depends(get_db)):
    """
    Get detailed document record.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
def get_document_status(document_id: str, db: Session = Depends(get_db)):
    """
    Poll status and progress of document processing.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": doc.id,
        "status": doc.status,
        "progress": doc.progress,
        "page_count": doc.page_count,
        "chunk_count": doc.chunk_count,
        "error_message": doc.error_message
    }


@router.get("/{document_id}/file")
def get_document_file(document_id: str, db: Session = Depends(get_db)):
    """
    Serve the PDF file for browser preview or download.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on storage")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=doc.original_name,
        content_disposition_type="inline"
    )


@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    """
    Delete a document, its physical file, and its vector embeddings.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # 1. Delete vectors from ChromaDB
    chroma_service.delete_document(document_id)

    # 2. Delete physical file
    try:
        file_path = Path(doc.file_path)
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        logger.warning(f"Failed to delete file on disk {doc.file_path}: {e}")

    # 3. Delete DB record
    db.delete(doc)
    db.commit()

    return {"status": "success", "message": f"Document {doc.original_name} deleted successfully"}
