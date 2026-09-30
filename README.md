# KnowFlow AI

> **Turn massive information into instant knowledge.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-orange.svg)](https://www.trychroma.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)

> 🎥 **Demo video:** _add your LinkedIn / YouTube link here_

![KnowFlow AI demo](docs/demo.gif)


**KnowFlow AI** is a full-stack Document Intelligence & Knowledge Retrieval platform powered by **Retrieval-Augmented Generation (RAG)**. It is built to solve a pervasive problem: reading hundreds or thousands of pages across massive document collections to find specific, verifiable information.

Users upload multi-page documents (textbooks, research papers, legal briefs, technical specifications) and can immediately ask questions, receive grounded answers strictly backed by document excerpts, view exact page citations, inspect source snippets side-by-side with an embedded PDF viewer, and launch automated AI study workflows (Executive Summaries, Practice Quizzes, Key Concepts, and Cornell Notes).

---

## 📑 Table of Contents

- [Product Vision & Problem](#product-vision--problem)
- [Architecture & Workflow](#architecture--workflow)
- [Core Features](#core-features)
- [Technology Stack](#technology-stack)
- [RAG Explained](#rag-explained)
- [Project Structure](#project-structure)
- [Getting Started (Windows & Cross-Platform)](#getting-started-windows--cross-platform)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [API Reference](#api-reference)
- [Hallucination Defense & Grounding](#hallucination-defense--grounding)
- [Performance & Scalability](#performance--scalability)
- [Security](#security)
- [License](#license)

---

## Product Vision & Problem

### The Problem
Traditional search keyword matching fails on semantic nuance, while vanilla Large Language Models (LLMs) hallucinate facts and cannot cite specific pages. Furthermore, sending entire 2,000+ page documents directly into an LLM context window:
1. Causes extreme latency and prohibitive token costs.
2. Suffers from the "lost in the middle" degradation where models overlook facts buried in massive contexts.
3. Completely misses page-level traceability.

### The KnowFlow Solution
KnowFlow AI employs a modular, page-aware RAG pipeline:
1. Extracts text page-by-page while preserving exact 1-indexed page boundaries.
2. Chunks text using recursive semantic splitting while embedding rich metadata (document ID, page number, section, source filename).
3. Indexes dense 384-dimensional vector representations in persistent ChromaDB via ONNX MiniLM-L6-v2.
4. Performs scoped vector similarity search (across the entire knowledge base, selected documents, or a single document).
5. Enforces strict prompt grounding: if an answer is unsupported, the system states: *"I couldn't find enough information about this in your uploaded knowledge."*

---

## Architecture & Workflow

```text
Upload PDF Document
        │
        ▼
Validate & Sanitize Filename (Path-traversal protection)
        │
        ▼
Page-by-Page Text Extraction (PyPDF / Outlines / Sections)
        │
        ▼
Page-Aware Intelligent Chunking (Recursive windowing, 1200 chars, 200 overlap)
        │
        ▼
Dense Vector Embedding (ONNX MiniLM-L6-v2, 384 dimensions)
        │
        ▼
Vector Indexing & Metadata Storage (ChromaDB + SQLite)
        │
        ▼
User Submits Question (Single Doc, Selected, or Entire Knowledge Base)
        │
        ▼
Scoped Similarity Search (Top-K dense retrieval with relevance score threshold)
        │
        ▼
Context Construction & Grounded Anti-Hallucination Prompt
        │
        ▼
LLM Generation (OpenRouter / OpenAI / Streaming SSE)
        │
        ▼
Grounded Answer + Page-Level Citations + Dual-Mode PDF Inspector
```

---

## Core Features

-  **Page-Aware Document Processing**: Preserves exact 1-indexed page numbers across every single chunk.
-  **Strict Anti-Hallucination Guard**: Never invents facts. Politely declines when context is absent.
-  **Flexible Knowledge Scoping**: Query a single document, a chosen subset of documents, or the entire knowledge base.
-  **Real-Time Streaming SSE**: Token-by-token streaming responses with sub-second time-to-first-token.
-  **Dual-Mode Source Inspector**:
  - Interactive citation cards showing page number, similarity confidence percentage, and snippet text.
  - Built-in PDF preview viewer that automatically scrolls to the cited page.
-  **AI Study Station**:
  - **Executive Summary**: High-level synthesis with structured takeaways.
  - **Practice Quiz**: 4 multiple-choice questions with instant answer reveal and page citations.
  - **Key Concepts**: Glossary of terms, formal definitions, and simple beginner analogies.
  - **Cornell Notes**: Markdown study notes with one-click copy to clipboard.
-  **Light & Dark Mode**: Handcrafted themes with dark slate backgrounds and crisp typography.
-  **Persistent Storage**: Retains documents, chat sessions, and vector indices across server restarts.

---

##  Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide React |
| **Backend API** | Python 3.11+, FastAPI, Pydantic v2, Uvicorn, SQLAlchemy |
| **Vector Store** | ChromaDB (Persistent client with SQLite/DuckDB storage) |
| **Embedding Engine** | ONNX MiniLM-L6-v2 (384-dimensional dense vectors via ONNX Runtime) |
| **LLM Orchestration** | OpenRouter API / OpenAI Client (Streaming SSE support) |
| **Relational DB** | SQLite (`data/knowflow.db`) |
| **Document Parser** | PyPDF 6.x |

---

##  RAG Explained

```text
Document (PDF)
      │
      ▼
Page Extraction ──► [Page 1, Page 2, ... Page N]
      │
      ▼
Chunking ─────────► [Chunk_p1_01, Chunk_p2_02, ...]
      │
      ▼
Embedding ────────► [384-dimensional vectors]
      │
      ▼
Vector Store ─────► Indexed with document_id & page_number
      │
User Query ───────► Query Embedding ──► Cosine Similarity Match
                                                 │
                                                 ▼
LLM ◄─── Strict Grounding Prompt + Top-K Relevant Excerpts
 │
 ▼
Grounded Answer + Clickable Page Citations
```

### Why not send the whole PDF to the LLM?
1. **Context Window Limits**: Even models with 1M token windows degrade on reasoning over massive needle-in-a-haystack prompts.
2. **Cost & Latency**: Processing 1,000 pages per question costs dollars per query and takes 30-60 seconds.
3. **Traceability**: RAG isolates the exact 3-5 paragraphs responsible for the answer, enabling page-level verification.

---

##  Project Structure

```text
knowflow-ai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── documents.py       # PDF upload, status polling, file preview, delete
│   │   │   ├── chat.py            # RAG sync & streaming SSE chat
│   │   │   ├── conversations.py   # Session management & message history
│   │   │   └── study.py           # Summary, Quiz, Concepts, Cornell Notes
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic Settings & environment loader
│   │   │   └── security.py        # Filename sanitization & path-traversal guard
│   │   ├── database/
│   │   │   ├── connection.py      # SQLite connection & sessionmaker
│   │   │   └── models.py          # SQLAlchemy models (Document, Conversation, Message)
│   │   ├── document_processing/
│   │   │   ├── pdf_extractor.py   # PyPDF text extraction preserving page numbers
│   │   │   └── chunker.py         # Page-aware sliding window chunker
│   │   ├── vectorstore/
│   │   │   └── chroma_service.py  # ChromaDB persistent collection & vector queries
│   │   ├── rag/
│   │   │   ├── prompts.py         # Grounding prompts & anti-hallucination guard
│   │   │   └── engine.py          # RAG orchestration, model fallbacks, streaming
│   │   ├── schemas/
│   │   │   └── schemas.py         # Pydantic request/response schemas
│   │   └── main.py                # FastAPI entrypoint & CORS middleware
│   ├── tests/
│   │   └── test_rag_pipeline.py   # Pytest automated test suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/            # Button, Badge, Modal, Toast, MarkdownRenderer
│   │   │   ├── layout/            # AppHeader, Sidebar, MobileDrawer
│   │   │   ├── chat/              # ChatInput, MessageItem, EmptyState
│   │   │   ├── documents/         # DocumentStudio
│   │   │   ├── sources/           # SourceInspectorPanel & PDF Viewer
│   │   │   ├── study/             # StudyToolsModal
│   │   │   └── settings/          # SettingsModal
│   │   ├── context/               # ThemeContext
│   │   ├── services/              # api.ts (Fetch API & SSE stream reader)
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
├── data/
│   ├── uploads/                   # Stored PDFs (gitignored)
│   └── vectorstore/               # ChromaDB persistence (gitignored)
├── tests/
│   └── e2e_live_test.py           # Live end-to-end test script
├── .env.example
├── .gitignore
├── README.md
└── docker-compose.yml
```

---

##  Getting Started (Windows & Cross-Platform)

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

---

### Backend Setup

1. Open a terminal and navigate to the backend:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   # Windows (PowerShell)
   python -m venv .venv
   .venv\Scripts\activate

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` file from the template (run this from the **project root**, one level above `backend/`):
   ```powershell
   cd ..

   # Windows
   Copy-Item .env.example .env

   # Linux / macOS
   cp .env.example .env

   cd backend
   ```
   *Add your OpenRouter API key (`sk-or-v1-...`) inside `.env`. Never commit this file.*

5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *API will be available at `http://localhost:8000`.*  
   *Interactive Swagger Documentation is at `http://localhost:8000/docs`.*

---

### Frontend Setup

1. Open a second terminal window and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Launch Vite development server:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:5173` in your browser.*

---

## 🧪 Running Automated Tests

Run the comprehensive pytest suite verifying extraction, chunking, vector indexing, retrieval, and chat:

```bash
python -m pytest backend/tests/test_rag_pipeline.py -v
```

Run the live end-to-end verification script against running servers:
```bash
python tests/e2e_live_test.py
```

---

##  API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health, SQLite, and ChromaDB status |
| `POST` | `/api/documents/upload` | Upload PDF and start background ingestion pipeline |
| `GET` | `/api/documents` | List all uploaded documents with status and metrics |
| `GET` | `/api/documents/{id}` | Get document metadata |
| `GET` | `/api/documents/{id}/status` | Poll document ingestion status and progress % |
| `GET` | `/api/documents/{id}/file` | Stream PDF file for browser preview |
| `DELETE` | `/api/documents/{id}` | Delete document, physical file, and vector embeddings |
| `POST` | `/api/chat` | Synchronous grounded RAG chat endpoint |
| `POST` | `/api/chat/stream` | Server-Sent Events (SSE) streaming chat endpoint |
| `GET` | `/api/conversations` | List chat sessions |
| `GET` | `/api/conversations/{id}` | Get full conversation messages and sources |
| `PATCH` | `/api/conversations/{id}/title` | Rename conversation title |
| `DELETE` | `/api/conversations/{id}` | Delete conversation session |
| `POST` | `/api/study/summary` | Generate executive summary and takeaways |
| `POST` | `/api/study/quiz` | Generate 4-question interactive practice quiz |
| `POST` | `/api/study/concepts` | Extract key definitions and simple analogies |
| `POST` | `/api/study/notes` | Generate Cornell-style Markdown study notes |

---

##  Hallucination Defense & Grounding

KnowFlow AI eliminates hallucinations through a multi-tier defense:
1. **Low Temperature**: Default sampling temperature is set to `0.2` for deterministic, fact-focused responses.
2. **Context Injection Constraint**: The system prompt strictly prohibits extrapolating beyond retrieved chunks.
3. **Explicit Refusal Instruction**: The model is instructed to output: *"I couldn't find enough information about this in your uploaded knowledge"* whenever similarity search does not meet confidence criteria.
4. **Traceable Page Citations**: Every assertion must link to an explicit `(Source: ..., Page X)` citation.

---

##  Performance & Scalability

- **Local Vector Inference**: Uses ChromaDB's built-in ONNX MiniLM-L6-v2 dense embeddings. Zero remote network overhead or rate limits during vectorization.
- **Batch Processing**: Chunks are embedded and indexed in batches of 100 to prevent memory spikes.
- **Background Pipeline**: FastAPI `BackgroundTasks` processes PDFs asynchronously so the UI never blocks.
- **SQLite to Postgres Ready**: SQLAlchemy ORM abstraction allows migrating from local SQLite to AWS RDS / PostgreSQL with a single connection string change.

---

##  Security

- **Path-Traversal Guard**: All uploaded filenames are stripped of directories (`../`, `\`), sanitized with regex, and saved with UUID prefixes.
- **Secret Isolation**: Frontend never handles or bundles API keys; all LLM and vector store calls are brokered through FastAPI backend.
- **Git Protection**: `.env`, uploaded PDFs, and vector directories are strictly gitignored.

---

## 📄 License

MIT License. Free for portfolio, educational, and commercial use.
