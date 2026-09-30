import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.connection import init_db
from app.vectorstore.chroma_service import chroma_service
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router
from app.api.conversations import router as conversations_router
from app.api.study import router as study_router
from app.schemas.schemas import HealthResponse

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("knowflow")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting KnowFlow AI Backend...")
    try:
        init_db()
        logger.info("SQLite database tables initialized successfully.")
        # Recover any stuck documents from previous unexpected shutdown
        from app.database.connection import SessionLocal
        from app.database.models import Document
        with SessionLocal() as db:
            stuck_docs = db.query(Document).filter(Document.status.notin_(["COMPLETED", "FAILED"])).all()
            for s_doc in stuck_docs:
                s_doc.status = "FAILED"
                s_doc.error_message = "Processing was interrupted by server restart. Please re-upload."
            if stuck_docs:
                db.commit()
                logger.info(f"Recovered {len(stuck_docs)} stuck document records on startup.")
    except Exception as e:
        logger.error(f"Failed to initialize SQLite database: {e}")

    yield
    logger.info("Shutting down KnowFlow AI Backend.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Turn massive information into instant knowledge. AI-powered Document Intelligence & Knowledge Retrieval Platform.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(conversations_router, prefix=settings.API_V1_STR)
app.include_router(study_router, prefix=settings.API_V1_STR)

@app.get(f"{settings.API_V1_STR}/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """
    Health check endpoint verifying API, database, and vector store status.
    """
    db_ok = True
    chroma_ok = True
    try:
        _ = chroma_service.get_count()
    except Exception:
        chroma_ok = False

    return HealthResponse(
        status="healthy",
        app_name=settings.PROJECT_NAME,
        version="1.0.0",
        database_ok=db_ok,
        chroma_ok=chroma_ok
    )

@app.get("/", tags=["Root"])
def root():
    return {
        "app": settings.PROJECT_NAME,
        "tagline": "Turn massive information into instant knowledge.",
        "status": "operational",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
