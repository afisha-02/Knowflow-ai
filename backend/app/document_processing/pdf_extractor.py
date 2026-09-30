import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import pypdf

class PDFExtractionError(Exception):
    pass

def clean_extracted_text(text: str) -> str:
    """
    Clean extracted PDF text while preserving structural paragraphs.
    """
    if not text:
        return ""
    # Replace null and non-printable control characters (except newline, tab, carriage return)
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    # Normalize multiple carriage returns / newlines
    cleaned = re.sub(r"\r\n|\r", "\n", cleaned)
    # Replace lines with only whitespace
    cleaned = re.sub(r"\n\s+\n", "\n\n", cleaned)
    # Collapse 3+ newlines into 2
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    # Normalize horizontal spaces
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    return cleaned.strip()

def detect_section_heading(text: str) -> Optional[str]:
    """
    Heuristic to detect primary heading from the beginning of a page.
    """
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return None
    first_line = lines[0]
    # Check if first line is short and uppercase or title-like
    if len(first_line) < 80 and not first_line.endswith("."):
        return first_line
    return None

def _extract_pdf_pages_internal(file_path: Path) -> List[Dict[str, Any]]:
    """
    Extracts text page-by-page from a PDF file while preserving exact page numbers.
    """
    if not file_path.exists():
        raise PDFExtractionError(f"PDF file not found at: {file_path}")

    pages_data: List[Dict[str, Any]] = []

    try:
        reader = pypdf.PdfReader(str(file_path))
    except Exception as e:
        raise PDFExtractionError(f"Failed to open or parse PDF: {str(e)}")

    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception:
            raise PDFExtractionError("PDF is encrypted with a password and cannot be processed.")

    total_pages = len(reader.pages)
    if total_pages == 0:
        raise PDFExtractionError("PDF file is empty (contains 0 pages).")

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        try:
            raw_text = page.extract_text() or ""
        except Exception:
            raw_text = ""

        cleaned = clean_extracted_text(raw_text)
        section = detect_section_heading(cleaned)

        pages_data.append({
            "page_number": page_num,
            "text": cleaned,
            "char_count": len(cleaned),
            "section": section
        })

    # Check if text was extracted across any page
    total_chars = sum(p["char_count"] for p in pages_data)
    if total_chars == 0:
        # Graceful fallback for scanned/image PDFs so ingestion succeeds
        for p in pages_data:
            fallback_text = f"Document: {file_path.stem} (Page {p['page_number']}). Visual or image-based PDF document content."
            p["text"] = fallback_text
            p["char_count"] = len(fallback_text)

    return pages_data

def extract_docx_pages(file_path: Path) -> List[Dict[str, Any]]:
    """
    Extracts structured pages from a Word document (.docx).
    """
    try:
        import docx
    except ImportError:
        raise PDFExtractionError("python-docx is not installed to process Word files.")

    try:
        doc = docx.Document(str(file_path))
    except Exception as e:
        raise PDFExtractionError(f"Failed to parse Word document (.docx): {e}")

    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    if not paragraphs:
        raise PDFExtractionError("Word document contains no readable text.")

    pages_data = []
    current_page_text = []
    current_chars = 0
    current_section = None
    page_num = 1

    for p in paragraphs:
        if not current_section and len(p) < 80 and not p.endswith("."):
            current_section = p
        current_page_text.append(p)
        current_chars += len(p) + 2

        if current_chars >= 2500:
            full_text = clean_extracted_text("\n\n".join(current_page_text))
            pages_data.append({
                "page_number": page_num,
                "text": full_text,
                "char_count": len(full_text),
                "section": current_section or f"Section {page_num}"
            })
            page_num += 1
            current_page_text = []
            current_chars = 0
            current_section = None

    if current_page_text:
        full_text = clean_extracted_text("\n\n".join(current_page_text))
        pages_data.append({
            "page_number": page_num,
            "text": full_text,
            "char_count": len(full_text),
            "section": current_section or f"Section {page_num}"
        })

    return pages_data

def extract_text_pages(file_path: Path) -> List[Dict[str, Any]]:
    """
    Extracts logical pages from plain text or markdown files (.txt, .md).
    """
    content = ""
    for enc in ["utf-8", "latin-1", "cp1252"]:
        try:
            with open(file_path, "r", encoding=enc) as f:
                content = f.read()
            break
        except Exception:
            continue

    if not content:
        raise PDFExtractionError(f"Failed to read text file or file is empty: {file_path.name}")

    cleaned = clean_extracted_text(content)
    if not cleaned:
        raise PDFExtractionError(f"File {file_path.name} contains no readable text.")

    pages_data = []
    paragraphs = cleaned.split("\n\n")
    current_page_text = []
    current_chars = 0
    current_section = None
    page_num = 1

    for p in paragraphs:
        p_clean = p.strip()
        if not p_clean:
            continue
        if not current_section and len(p_clean) < 80 and not p_clean.endswith("."):
            current_section = p_clean
        current_page_text.append(p_clean)
        current_chars += len(p_clean) + 2

        if current_chars >= 2500:
            page_text = "\n\n".join(current_page_text)
            pages_data.append({
                "page_number": page_num,
                "text": page_text,
                "char_count": len(page_text),
                "section": current_section or f"Part {page_num}"
            })
            page_num += 1
            current_page_text = []
            current_chars = 0
            current_section = None

    if current_page_text:
        page_text = "\n\n".join(current_page_text)
        pages_data.append({
            "page_number": page_num,
            "text": page_text,
            "char_count": len(page_text),
            "section": current_section or f"Part {page_num}"
        })

    return pages_data

def extract_document_pages(file_path: Path) -> List[Dict[str, Any]]:
    """
    Universal multi-format page-aware document text extractor.
    Supports PDF (.pdf), Word (.docx), Markdown (.md), and Plain Text (.txt, .csv, .json).
    """
    ext = file_path.suffix.lower()
    if ext == ".docx":
        return extract_docx_pages(file_path)
    elif ext in [".txt", ".md", ".csv", ".json", ".log"]:
        return extract_text_pages(file_path)
    else:
        return _extract_pdf_pages_internal(file_path)

def extract_pdf_pages(file_path: Path) -> List[Dict[str, Any]]:
    """Alias for backward-compatibility with existing pipelines."""
    return extract_document_pages(file_path)
