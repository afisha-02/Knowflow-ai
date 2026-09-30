import json
import logging
import re
from typing import List, Dict, Any, Optional, Tuple, AsyncGenerator
import openai
import httpx
from app.core.config import settings
from app.rag.prompts import (
    RAG_SYSTEM_PROMPT,
    format_rag_context,
    build_user_prompt_with_context
)
from app.vectorstore.chroma_service import chroma_service

logger = logging.getLogger(__name__)

class LocalDocumentSynthesizer:
    """
    Intelligent local extractive and synthesis engine that operates directly
    on retrieved ChromaDB vector chunks when cloud providers or local LLMs are unreachable.
    """
    @staticmethod
    def synthesize_answer(query: str, chunks: List[Dict[str, Any]], mode: str = "document") -> str:
        if not chunks:
            return (
                "I couldn't find enough information about this in your uploaded knowledge. "
                "Please verify that relevant documents are uploaded and selected in your active scope."
            )

        # Collect distinct documents and pages
        doc_names = list(dict.fromkeys([c.get("document_name", "Document") for c in chunks]))
        pages_cited = sorted(list(set([c.get("page_number", 1) for c in chunks])))
        pages_str = ", ".join([f"Page {p}" for p in pages_cited])

        # Score-ranked chunks
        sorted_chunks = sorted(chunks, key=lambda x: x.get("score", 0.0), reverse=True)

        # Extract high-value sentences from snippets
        extracted_points = []
        seen_sentences = set()

        query_words = set(re.findall(r'\b\w{3,}\b', query.lower()))

        for chunk in sorted_chunks[:4]:
            text = chunk.get("snippet", "").strip()
            page = chunk.get("page_number", 1)
            doc_name = chunk.get("document_name", "Document")
            section = chunk.get("section", "")

            # Split into sentences or lines
            raw_lines = [l.strip() for l in re.split(r'(?<=[.!?])\s+|\n+', text) if len(l.strip()) > 15]

            for line in raw_lines:
                # Deduplicate
                norm = line.lower()[:60]
                if norm in seen_sentences:
                    continue
                seen_sentences.add(norm)

                # Score relevance to query
                line_words = set(re.findall(r'\b\w{3,}\b', line.lower()))
                relevance = len(query_words.intersection(line_words))

                extracted_points.append({
                    "text": line,
                    "page": page,
                    "doc": doc_name,
                    "section": section,
                    "relevance": relevance
                })

        # Sort points by query relevance then position
        extracted_points.sort(key=lambda x: x["relevance"], reverse=True)
        top_points = extracted_points[:6]

        # Construct structured Markdown response
        header_doc = f"**{', '.join(doc_names)}** ({pages_str})"

        bullet_blocks = []
        for idx, pt in enumerate(top_points, 1):
            clean_text = pt["text"].strip().rstrip(".")
            bullet_blocks.append(
                f"- **Key Information {idx}** (*{pt['doc']}*, Page {pt['page']}):\n"
                f"  > \"{clean_text}.\""
            )

        summary_bullets = "\n\n".join(bullet_blocks)

        return (
            f"### Grounded Document Knowledge\n\n"
            f"Based on the verified excerpts retrieved from {header_doc}:\n\n"
            f"{summary_bullets}\n\n"
            f"---\n\n"
            f"*Synthesized directly from verified document chunks via the Local Knowledge Engine.*"
        )


class RAGEngine:
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = settings.OPENROUTER_BASE_URL
        self.default_model = settings.OPENROUTER_MODEL
        self.fallback_model = settings.OPENROUTER_FALLBACK_MODEL
        self.ollama_base_url = settings.OLLAMA_BASE_URL
        self.ollama_model = settings.OLLAMA_MODEL

        # OpenRouter client
        self.client = openai.OpenAI(
            api_key=self.api_key or "sk-dummy",
            base_url=self.base_url,
            timeout=25.0
        )
        self.async_client = openai.AsyncOpenAI(
            api_key=self.api_key or "sk-dummy",
            base_url=self.base_url,
            timeout=25.0
        )

    def retrieve_context(
        self,
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: Optional[int] = None,
        threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        k = top_k or settings.DEFAULT_TOP_K
        thresh = threshold if threshold is not None else 0.20
        return chroma_service.query(
            query_text=query,
            n_results=k,
            document_ids=document_ids,
            score_threshold=thresh
        )

    def evaluate_relevance(
        self,
        query: str,
        chunks: List[Dict[str, Any]]
    ) -> Tuple[str, str, str, List[Dict[str, Any]], List[str]]:
        if not chunks or chroma_service.get_count() == 0:
            return "DOCUMENT_NOT_FOUND", "general", "none", [], []

        stopwords = {
            "what", "is", "an", "the", "and", "or", "for", "in", "on", "at", "to", "of",
            "with", "by", "from", "about", "how", "why", "when", "where", "which", "who",
            "explain", "describe", "detail", "tell", "me", "please", "can", "you", "does",
            "do", "did", "are", "were", "was", "will", "would", "could", "should", "your",
            "uploaded", "document", "documents", "pdf", "textbook", "notes", "according"
        }

        raw_terms = re.findall(r'\b[A-Za-z0-9-]{2,}\b', query)
        query_terms = [t for t in raw_terms if t.lower() not in stopwords]

        found_terms = set()
        missing_terms = []
        all_chunk_text = " ".join([c.get("snippet", "").lower() for c in chunks])

        for term in query_terms:
            pattern = r'\b' + re.escape(term.lower()) + r'\b'
            if re.search(pattern, all_chunk_text):
                found_terms.add(term)
            else:
                missing_terms.append(term)

        max_score = max([c.get("score", 0.0) for c in chunks]) if chunks else 0.0

        if len(found_terms) == 0 and max_score < 0.40:
            return "DOCUMENT_NOT_FOUND", "general", "none", [], query_terms

        decision = "DOCUMENT_SUPPORTED"
        mode = "document"
        support = "full"
        filtered = [c for c in chunks if c.get("score", 0.0) >= 0.25]
        return decision, mode, support, (filtered or chunks[:3]), []

    def _build_messages(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None,
        relevance_decision: str = "DOCUMENT_SUPPORTED",
        missing_concepts: List[str] = None
    ) -> List[Dict[str, str]]:
        messages = [{"role": "system", "content": RAG_SYSTEM_PROMPT}]

        if conversation_history:
            for hist in conversation_history[-6:]:
                role = hist.get("role", "user")
                content = hist.get("content", "")
                if role in ["user", "assistant"] and content:
                    messages.append({"role": role, "content": content})

        context_str = format_rag_context(retrieved_chunks)
        user_content = build_user_prompt_with_context(
            query=query,
            context_str=context_str,
            relevance_decision=relevance_decision,
            missing_concepts=missing_concepts
        )
        messages.append({"role": "user", "content": user_content})

        return messages

    async def _try_ollama(self, messages: List[Dict[str, str]], model: str = None) -> Optional[str]:
        target_model = model or self.ollama_model
        url = f"{self.ollama_base_url.rstrip('/')}/v1/chat/completions"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    url,
                    json={
                        "model": target_model,
                        "messages": messages,
                        "temperature": 0.2
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.info(f"Ollama local inference unavailable: {e}")
        return None

    def generate_answer(
        self,
        query: str,
        document_ids: Optional[List[str]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        top_k: Optional[int] = None,
        temperature: Optional[float] = None,
        model_name: Optional[str] = None,
        provider: str = "openrouter"
    ) -> Dict[str, Any]:
        """
        Execute RAG generation with multi-tier fallback:
        Tier 1: Selected Provider (OpenRouter / Ollama / Local)
        Tier 2: Alternative Free OpenRouter models
        Tier 3: Ollama local instance
        Tier 4: Local Document Synthesizer (Guaranteed 100% uptime response)
        """
        raw_chunks = self.retrieve_context(query, document_ids=document_ids, top_k=top_k)
        decision, mode, support, filtered_chunks, missing = self.evaluate_relevance(query, raw_chunks)

        # If user explicitly requested Local Knowledge Engine
        if provider == "local":
            local_ans = LocalDocumentSynthesizer.synthesize_answer(query, filtered_chunks, mode)
            return {
                "answer": local_ans,
                "sources": filtered_chunks,
                "model": "local-synthesizer",
                "mode": mode,
                "document_support": support,
                "provider": "local"
            }

        messages = self._build_messages(
            query=query,
            retrieved_chunks=filtered_chunks,
            conversation_history=conversation_history,
            relevance_decision=decision,
            missing_concepts=missing
        )
        temp = temperature if temperature is not None else settings.DEFAULT_TEMPERATURE

        # Tier 1 & 2: OpenRouter models cascade
        models_to_try = [
            model_name or self.default_model,
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            "liquid/lfm-2.5-2.6b:free",
            "qwen/qwen3.8-27b:free",
            "google/gemma-4-26b-a4b-it:free"
        ]
        # Deduplicate preserving order
        seen_m = set()
        clean_models = []
        for m in models_to_try:
            if m and m not in seen_m:
                seen_m.add(m)
                clean_models.append(m)

        for current_model in clean_models:
            try:
                response = self.client.chat.completions.create(
                    model=current_model,
                    messages=messages,
                    temperature=temp,
                    max_tokens=1500,
                    timeout=25.0
                )
                if not response or not getattr(response, "choices", None):
                    continue
                choice = response.choices[0]
                answer = getattr(choice.message, "content", None) or getattr(choice.message, "reasoning", "") or ""
                if not answer or not answer.strip():
                    continue
                return {
                    "answer": answer,
                    "sources": filtered_chunks,
                    "model": current_model,
                    "mode": mode,
                    "document_support": support,
                    "provider": "openrouter"
                }
            except Exception as e:
                logger.warning(f"OpenRouter model {current_model} failed: {e}")

        # Tier 3: Try Ollama local
        try:
            with httpx.Client(timeout=10.0) as sync_client:
                url = f"{self.ollama_base_url.rstrip('/')}/v1/chat/completions"
                res = sync_client.post(
                    url,
                    json={"model": self.ollama_model, "messages": messages, "temperature": temp}
                )
                if res.status_code == 200:
                    answer = res.json()["choices"][0]["message"]["content"]
                    return {
                        "answer": answer,
                        "sources": filtered_chunks,
                        "model": f"ollama-{self.ollama_model}",
                        "mode": mode,
                        "document_support": support,
                        "provider": "ollama"
                    }
        except Exception as e:
            logger.info(f"Ollama fallback skipped: {e}")

        # Tier 4: Zero-downtime Local Knowledge Synthesizer
        logger.info("Engaging Local Document Synthesizer fallback")
        local_ans = LocalDocumentSynthesizer.synthesize_answer(query, filtered_chunks, mode)
        return {
            "answer": local_ans,
            "sources": filtered_chunks,
            "model": "local-synthesizer",
            "mode": mode,
            "document_support": support,
            "provider": "local"
        }

    async def stream_answer(
        self,
        query: str,
        document_ids: Optional[List[str]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        top_k: Optional[int] = None,
        temperature: Optional[float] = None,
        model_name: Optional[str] = None,
        provider: str = "openrouter"
    ) -> AsyncGenerator[str, None]:
        raw_chunks = self.retrieve_context(query, document_ids=document_ids, top_k=top_k)
        decision, mode, support, filtered_chunks, missing = self.evaluate_relevance(query, raw_chunks)

        meta_event = {
            "event": "sources",
            "sources": filtered_chunks,
            "mode": mode,
            "document_support": support
        }
        yield f"data: {json.dumps(meta_event)}\n\n"

        # If user explicitly requested Local Knowledge Engine
        if provider == "local":
            local_ans = LocalDocumentSynthesizer.synthesize_answer(query, filtered_chunks, mode)
            # Yield in natural token chunks
            for word in local_ans.split(" "):
                yield f"data: {json.dumps({'event': 'token', 'token': word + ' '})}\n\n"
            yield f"data: {json.dumps({'event': 'done', 'model': 'local-synthesizer', 'mode': mode, 'document_support': support, 'provider': 'local'})}\n\n"
            return

        messages = self._build_messages(
            query=query,
            retrieved_chunks=filtered_chunks,
            conversation_history=conversation_history,
            relevance_decision=decision,
            missing_concepts=missing
        )
        temp = temperature if temperature is not None else settings.DEFAULT_TEMPERATURE

        # Models cascade
        models_to_try = [
            model_name or self.default_model,
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            "liquid/lfm-2.5-2.6b:free",
            "qwen/qwen3.8-27b:free",
            "google/gemma-4-26b-a4b-it:free"
        ]
        seen_m = set()
        clean_models = [m for m in models_to_try if m and not (m in seen_m or seen_m.add(m))]

        success = False
        used_model = "unknown"

        for current_model in clean_models:
            try:
                stream = await self.async_client.chat.completions.create(
                    model=current_model,
                    messages=messages,
                    temperature=temp,
                    max_tokens=1500,
                    stream=True,
                    timeout=25.0
                )
                streamed_any = False
                async for part in stream:
                    if not part or not getattr(part, "choices", None):
                        continue
                    delta = part.choices[0].delta
                    token = getattr(delta, "content", None) or getattr(delta, "reasoning", None)
                    if token:
                        streamed_any = True
                        yield f"data: {json.dumps({'event': 'token', 'token': token})}\n\n"

                if streamed_any:
                    success = True
                    used_model = current_model
                    yield f"data: {json.dumps({'event': 'done', 'model': current_model, 'mode': mode, 'document_support': support, 'provider': 'openrouter'})}\n\n"
                    break
            except Exception as e:
                logger.warning(f"Streaming error on {current_model}: {e}")

        if not success:
            # Try Ollama streaming
            try:
                url = f"{self.ollama_base_url.rstrip('/')}/api/chat"
                async with httpx.AsyncClient(timeout=30.0) as client:
                    async with client.stream("POST", url, json={"model": self.ollama_model, "messages": messages, "stream": True}) as o_stream:
                        if o_stream.status_code == 200:
                            async for raw_line in o_stream.aiter_lines():
                                if raw_line:
                                    j = json.loads(raw_line)
                                    msg_piece = j.get("message", {}).get("content", "")
                                    if msg_piece:
                                        yield f"data: {json.dumps({'event': 'token', 'token': msg_piece})}\n\n"
                            success = True
                            yield f"data: {json.dumps({'event': 'done', 'model': f'ollama-{self.ollama_model}', 'mode': mode, 'document_support': support, 'provider': 'ollama'})}\n\n"
            except Exception as e:
                logger.info(f"Ollama streaming fallback failed: {e}")

        if not success:
            # Fallback to Local Document Synthesizer with simulated stream
            logger.info("Streaming Local Document Synthesizer fallback")
            local_ans = LocalDocumentSynthesizer.synthesize_answer(query, filtered_chunks, mode)
            for word in local_ans.split(" "):
                yield f"data: {json.dumps({'event': 'token', 'token': word + ' '})}\n\n"
            yield f"data: {json.dumps({'event': 'done', 'model': 'local-synthesizer', 'mode': mode, 'document_support': support, 'provider': 'local'})}\n\n"

rag_engine = RAGEngine()
