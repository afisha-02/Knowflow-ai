from typing import List, Dict, Any, Optional

def recursive_split_text(text: str, chunk_size: int = 1200, chunk_overlap: int = 200) -> List[str]:
    """
    Split text respecting paragraph and sentence boundaries.
    """
    if len(text) <= chunk_size:
        return [text] if text.strip() else []

    chunks = []
    # Primary separators in order of preference
    separators = ["\n\n", "\n", ". ", "? ", "! ", " ", ""]

    def split_recursive(sub_text: str, sep_idx: int) -> List[str]:
        if len(sub_text) <= chunk_size or sep_idx >= len(separators):
            return [sub_text.strip()] if sub_text.strip() else []

        sep = separators[sep_idx]
        if sep == "":
            # Character-level fallback
            splits = [sub_text[i:i + chunk_size] for i in range(0, len(sub_text), chunk_size - chunk_overlap)]
            return [s.strip() for s in splits if s.strip()]

        parts = sub_text.split(sep)
        result = []
        current_chunk = []
        current_len = 0

        for part in parts:
            part_len = len(part) + len(sep)
            if current_len + part_len > chunk_size and current_chunk:
                merged = sep.join(current_chunk).strip()
                if merged:
                    result.append(merged)
                # Keep overlap from the end of current_chunk if possible
                overlap_accum = []
                overlap_len = 0
                for item in reversed(current_chunk):
                    item_cost = len(item) + len(sep)
                    if overlap_len + item_cost <= chunk_overlap:
                        overlap_accum.append(item)
                        overlap_len += item_cost
                    else:
                        break
                overlap_accum.reverse()
                current_chunk = overlap_accum
                current_len = overlap_len

            current_chunk.append(part)
            current_len += part_len

        if current_chunk:
            merged = sep.join(current_chunk).strip()
            if merged:
                result.append(merged)

        # Refine any chunks that still exceed chunk_size
        final_splits = []
        for piece in result:
            if len(piece) > chunk_size and sep_idx + 1 < len(separators):
                final_splits.extend(split_recursive(piece, sep_idx + 1))
            else:
                final_splits.append(piece)

        return final_splits

    return split_recursive(text, 0)

def chunk_document_pages(
    pages_data: List[Dict[str, Any]],
    document_id: str,
    document_name: str,
    chunk_size: int = 1200,
    chunk_overlap: int = 200
) -> List[Dict[str, Any]]:
    """
    Page-aware intelligent chunker.
    Preserves exact page metadata, section information, and chunk identifiers.
    """
    all_chunks: List[Dict[str, Any]] = []
    global_chunk_idx = 0

    for page in pages_data:
        page_num = page["page_number"]
        page_text = page.get("text", "").strip()
        section = page.get("section")

        if not page_text:
            continue

        # Split text within the page
        splits = recursive_split_text(page_text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

        for chunk_text in splits:
            if len(chunk_text.strip()) < 20:
                # Skip tiny noise artifacts
                continue

            global_chunk_idx += 1
            chunk_id = f"{document_id}_p{page_num:04d}_c{global_chunk_idx:04d}"

            all_chunks.append({
                "chunk_id": chunk_id,
                "document_id": document_id,
                "document_name": document_name,
                "page_number": page_num,
                "page_end": page_num,
                "section": section or f"Page {page_num}",
                "text": chunk_text,
                "char_count": len(chunk_text),
                "source": document_name
            })

    return all_chunks
