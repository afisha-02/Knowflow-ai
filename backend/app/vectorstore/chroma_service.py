import logging
import threading
from typing import List, Dict, Any, Optional, Callable
import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from app.core.config import settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "knowflow_documents"

class ChromaService:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(ChromaService, cls).__new__(cls)
                    cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        persist_dir = str(settings.CHROMA_PERSIST_DIR)
        logger.info(f"Initializing ChromaDB persistent client at: {persist_dir}")
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self.embedding_fn = DefaultEmbeddingFunction()
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=self.embedding_fn,
            metadata={"description": "KnowFlow AI page-aware document embeddings"}
        )

    def _reinit_collection(self):
        """Self-heal / reacquire collection reference in case of segment or compaction hiccup."""
        try:
            self.collection = self.client.get_or_create_collection(
                name=COLLECTION_NAME,
                embedding_function=self.embedding_fn,
                metadata={"description": "KnowFlow AI page-aware document embeddings"}
            )
        except Exception as e:
            logger.error(f"Failed to reinit ChromaDB collection: {e}")

    def add_chunks(
        self,
        chunks: List[Dict[str, Any]],
        batch_size: int = 40,
        on_progress: Optional[Callable[[int, int], None]] = None
    ) -> int:
        """
        Add chunks using thread-safe, resilient batch upserting.
        Reports progress per batch to allow smooth, real-time UI updates.
        """
        if not chunks:
            return 0

        total_added = 0
        total_chunks = len(chunks)

        with self._lock:
            for i in range(0, total_chunks, batch_size):
                batch = chunks[i:i + batch_size]
                ids = [c["chunk_id"] for c in batch]
                documents = [c["text"] for c in batch]
                metadatas = [{
                    "document_id": str(c["document_id"]),
                    "document_name": str(c["document_name"]),
                    "page_number": int(c["page_number"]),
                    "page_end": int(c.get("page_end", c["page_number"])),
                    "section": str(c.get("section") or ""),
                    "source": str(c.get("source") or c["document_name"])
                } for c in batch]

                try:
                    self.collection.upsert(
                        ids=ids,
                        documents=documents,
                        metadatas=metadatas
                    )
                except Exception as e:
                    err_msg = str(e).lower()
                    if "compaction" in err_msg or "hnsw" in err_msg or "locked" in err_msg:
                        logger.warning(f"ChromaDB compaction/lock issue during upsert ({e}). Retrying batch with reinit...")
                        self._reinit_collection()
                        # Retry once
                        self.collection.upsert(
                            ids=ids,
                            documents=documents,
                            metadatas=metadatas
                        )
                    else:
                        raise e

                total_added += len(batch)
                if on_progress:
                    try:
                        on_progress(total_added, total_chunks)
                    except Exception as pe:
                        logger.debug(f"on_progress callback error: {pe}")

        logger.info(f"Successfully upserted {total_added} chunks to ChromaDB collection.")
        return total_added

    def _extract_query_terms(self, query_text: str) -> List[str]:
        """
        Extract high-signal technical terms, acronyms, and keywords from the user query.
        """
        import re
        stopwords = {
            "what", "is", "an", "the", "and", "or", "for", "in", "on", "at", "to", "of",
            "with", "by", "from", "about", "how", "why", "when", "where", "which", "who",
            "explain", "describe", "detail", "tell", "me", "please", "can", "you", "does",
            "do", "did", "are", "were", "was", "will", "would", "could", "should", "your",
            "uploaded", "document", "documents", "pdf", "textbook", "notes", "according"
        }

        # 1. Technical acronyms and uppercase terms (e.g. FCFS, SJF, RR, TCP, UDP, SQL, CPU)
        acronyms = re.findall(r'\b[A-Za-z0-9-]{2,}\b', query_text)
        high_signal = []
        for word in acronyms:
            clean = word.strip(".,;:?!'\"()[]{}")
            if not clean:
                continue
            lower = clean.lower()
            if lower in stopwords:
                continue
            # Check if it's an acronym or capitalized technical word
            if clean.isupper() or any(c.isupper() for c in clean[1:]) or "-" in clean or len(clean) >= 4:
                if lower not in [h.lower() for h in high_signal]:
                    high_signal.append(clean)

        return high_signal

    def query(
        self,
        query_text: str,
        n_results: int = 4,
        document_ids: Optional[List[str]] = None,
        score_threshold: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Perform hybrid similarity and keyword-boosted search with optional document scope filtering.
        """
        where_clause = None
        if document_ids:
            valid_ids = [d for d in document_ids if d and d != "all"]
            if len(valid_ids) == 1:
                where_clause = {"document_id": valid_ids[0]}
            elif len(valid_ids) > 1:
                where_clause = {"document_id": {"$in": valid_ids}}

        total_count = self.collection.count()
        if total_count == 0:
            return []

        key_terms = self._extract_query_terms(query_text)

        # 1. Primary semantic search with wider candidate window
        candidate_n = min(total_count, max(12, n_results * 3))
        results = self.collection.query(
            query_texts=[query_text],
            n_results=candidate_n,
            where=where_clause
        )

        candidates: Dict[str, Dict[str, Any]] = {}

        if results and results.get("documents") and results["documents"][0]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if results.get("metadatas") else []
            ids = results["ids"][0] if results.get("ids") else []
            distances = results["distances"][0] if results.get("distances") else []

            for i in range(len(docs)):
                doc_text = docs[i]
                meta = metas[i] if i < len(metas) else {}
                chunk_id = ids[i] if i < len(ids) else f"chunk_{i}"
                dist = distances[i] if i < len(distances) else 1.0

                base_similarity = max(0.0, min(1.0, 1.0 / (1.0 + float(dist))))

                candidates[chunk_id] = {
                    "chunk_id": chunk_id,
                    "document_id": meta.get("document_id", ""),
                    "document_name": meta.get("document_name", "Document"),
                    "page_number": int(meta.get("page_number", 1)),
                    "page_end": int(meta.get("page_end", meta.get("page_number", 1))),
                    "section": meta.get("section", ""),
                    "snippet": doc_text,
                    "score": round(base_similarity, 4),
                    "source": meta.get("source", meta.get("document_name", "Document")),
                    "matched_terms": []
                }

        # 2. Targeted search for specific technical terms/acronyms to ensure they are not missed
        if key_terms and len(candidates) < total_count:
            for term in key_terms[:3]:  # Top 3 terms
                try:
                    term_results = self.collection.query(
                        query_texts=[term],
                        n_results=min(total_count, 4),
                        where=where_clause
                    )
                    if term_results and term_results.get("documents") and term_results["documents"][0]:
                        t_docs = term_results["documents"][0]
                        t_metas = term_results["metadatas"][0] if term_results.get("metadatas") else []
                        t_ids = term_results["ids"][0] if term_results.get("ids") else []
                        t_distances = term_results["distances"][0] if term_results.get("distances") else []

                        for j in range(len(t_docs)):
                            cid = t_ids[j]
                            if cid not in candidates:
                                t_dist = t_distances[j] if j < len(t_distances) else 1.0
                                sim = max(0.0, min(1.0, 1.0 / (1.0 + float(t_dist))))
                                t_meta = t_metas[j] if j < len(t_metas) else {}
                                candidates[cid] = {
                                    "chunk_id": cid,
                                    "document_id": t_meta.get("document_id", ""),
                                    "document_name": t_meta.get("document_name", "Document"),
                                    "page_number": int(t_meta.get("page_number", 1)),
                                    "page_end": int(t_meta.get("page_end", t_meta.get("page_number", 1))),
                                    "section": t_meta.get("section", ""),
                                    "snippet": t_docs[j],
                                    "score": round(sim, 4),
                                    "source": t_meta.get("source", t_meta.get("document_name", "Document")),
                                    "matched_terms": []
                                }
                except Exception as e:
                    logger.debug(f"Targeted keyword query skipped for term '{term}': {e}")

        # 3. Lexical boost & Term Matching
        import re
        for item in candidates.values():
            snippet_lower = item["snippet"].lower()
            matched = []
            boost = 0.0
            for term in key_terms:
                pattern = r'\b' + re.escape(term.lower()) + r'\b'
                if re.search(pattern, snippet_lower):
                    matched.append(term)
                    # Significant bonus for exact technical acronym/term hit
                    boost += 0.12 if term.isupper() or len(term) <= 5 else 0.08

            item["matched_terms"] = matched
            # Boost score, bounded at 1.0
            item["score"] = round(min(1.0, item["score"] + boost), 4)

        # 4. Sort candidates by score descending
        sorted_candidates = sorted(
            candidates.values(),
            key=lambda x: (len(x["matched_terms"]), x["score"]),
            reverse=True
        )

        # Filter by threshold
        final_results = [
            c for c in sorted_candidates if c["score"] >= score_threshold
        ][:n_results]

        return final_results

    def delete_document(self, document_id: str) -> bool:
        """
        Delete all chunks associated with a document_id.
        """
        with self._lock:
            try:
                self.collection.delete(where={"document_id": document_id})
                logger.info(f"Deleted vectors for document_id: {document_id}")
                return True
            except Exception as e:
                logger.error(f"Error deleting vectors for {document_id}: {e}")
                return False

    def get_count(self) -> int:
        try:
            return self.collection.count()
        except Exception:
            return 0

chroma_service = ChromaService()
