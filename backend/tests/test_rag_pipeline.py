import os
import pytest
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from fastapi.testclient import TestClient
import sys

# Ensure backend in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.document_processing.pdf_extractor import extract_pdf_pages
from app.document_processing.chunker import chunk_document_pages
from app.vectorstore.chroma_service import chroma_service
from app.api.documents import process_document_pipeline
from app.database.connection import SessionLocal
from app.database.models import Document, Conversation, Message

client = TestClient(app)

@pytest.fixture(scope="session")
def sample_pdf(tmp_path_factory):
    """
    Generate a 3-page synthetic PDF with known facts on specific pages.
    """
    temp_dir = tmp_path_factory.mktemp("pdf_test")
    pdf_path = temp_dir / "Deep_Learning_Fundamentals.pdf"
    
    c = canvas.Canvas(str(pdf_path), pagesize=letter)
    
    # Page 1: Overview
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "Chapter 1: Neural Networks Introduction")
    c.setFont("Helvetica", 12)
    c.drawString(100, 720, "Neural networks are computational models inspired by biological neural brains.")
    c.drawString(100, 700, "They consist of layers of interconnected processing nodes or artificial neurons.")
    c.drawString(100, 680, "Supervised learning utilizes labeled datasets to train parameters.")
    c.showPage()
    
    # Page 2: Backpropagation
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "Chapter 2: Optimization and Backpropagation")
    c.setFont("Helvetica", 12)
    c.drawString(100, 720, "Backpropagation is the fundamental algorithm for computing gradients in neural nets.")
    c.drawString(100, 700, "It applies the calculus chain rule backwards from the loss function to each weight.")
    c.drawString(100, 680, "The computational complexity of backpropagation is linear in the number of weights.")
    c.showPage()
    
    # Page 3: Activation Functions
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "Chapter 3: Non-Linear Activation Functions")
    c.setFont("Helvetica", 12)
    c.drawString(100, 720, "ReLU or Rectified Linear Unit is defined mathematically as f(x) = max(0, x).")
    c.drawString(100, 700, "ReLU mitigates the vanishing gradient problem encountered in deep sigmoidal networks.")
    c.showPage()
    
    c.save()
    return pdf_path


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database_ok"] is True
    assert data["chroma_ok"] is True


def test_pdf_extraction_page_accuracy(sample_pdf):
    pages = extract_pdf_pages(sample_pdf)
    assert len(pages) == 3
    assert pages[0]["page_number"] == 1
    assert "Neural networks are computational models" in pages[0]["text"]
    assert pages[1]["page_number"] == 2
    assert "Backpropagation is the fundamental algorithm" in pages[1]["text"]
    assert pages[2]["page_number"] == 3
    assert "ReLU or Rectified Linear Unit" in pages[2]["text"]


def test_page_aware_chunking(sample_pdf):
    pages = extract_pdf_pages(sample_pdf)
    chunks = chunk_document_pages(
        pages_data=pages,
        document_id="test_doc_001",
        document_name="Deep_Learning_Fundamentals.pdf",
        chunk_size=500,
        chunk_overlap=50
    )
    assert len(chunks) >= 3
    for chunk in chunks:
        assert "document_id" in chunk
        assert "page_number" in chunk
        assert "chunk_id" in chunk
        assert "text" in chunk
        assert chunk["page_number"] in [1, 2, 3]


def test_chroma_indexing_and_scoped_retrieval(sample_pdf):
    pages = extract_pdf_pages(sample_pdf)
    chunks = chunk_document_pages(
        pages_data=pages,
        document_id="dl_doc_test",
        document_name="Deep_Learning_Fundamentals.pdf"
    )
    
    # Add to Chroma
    added = chroma_service.add_chunks(chunks)
    assert added == len(chunks)
    
    # Query for backpropagation
    results = chroma_service.query(
        query_text="How does backpropagation compute gradients?",
        n_results=2,
        document_ids=["dl_doc_test"]
    )
    assert len(results) > 0
    top_hit = results[0]
    assert top_hit["document_id"] == "dl_doc_test"
    assert "backpropagation" in top_hit["snippet"].lower()
    assert top_hit["page_number"] == 2
    assert top_hit["score"] > 0.0

    # Clean up test vectors
    deleted = chroma_service.delete_document("dl_doc_test")
    assert deleted is True


def test_conversations_api():
    resp = client.get("/api/conversations")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_full_document_ingestion_and_chat(sample_pdf):
    # Upload via API
    with open(sample_pdf, "rb") as f:
        resp = client.post(
            "/api/documents/upload",
            files={"file": ("Deep_Learning_Fundamentals.pdf", f, "application/pdf")}
        )
    assert resp.status_code == 200
    doc_data = resp.json()
    doc_id = doc_data["id"]

    # Query file_path from DB
    db = SessionLocal()
    db_doc = db.query(Document).filter(Document.id == doc_id).first()
    file_path = db_doc.file_path
    db.close()

    # Run processing synchronously for test
    process_document_pipeline(doc_id, file_path, doc_data["original_name"])

    # Check status
    status_resp = client.get(f"/api/documents/{doc_id}/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "COMPLETED"
    assert status_resp.json()["page_count"] == 3

    # Query chat API
    chat_resp = client.post(
        "/api/chat",
        json={
            "message": "What calculus rule does backpropagation use?",
            "document_scope": "single",
            "selected_document_ids": [doc_id]
        }
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert len(chat_data["sources"]) > 0
    assert chat_data["sources"][0]["page_number"] == 2
    assert "chain rule" in chat_data["sources"][0]["snippet"].lower()

    # Clean up
    del_resp = client.delete(f"/api/documents/{doc_id}")
    assert del_resp.status_code == 200
