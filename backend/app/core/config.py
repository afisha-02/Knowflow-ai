import os
import json
from pathlib import Path
from typing import List, Union, Any
from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "KnowFlow AI"
    API_V1_STR: str = "/api"

    # Primary Provider: OpenRouter
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "liquid/lfm-2.5-2.6b:free"
    OPENROUTER_FALLBACK_MODEL: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Local Provider: Ollama
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "llama3"

    # Default Provider: "openrouter", "ollama", or "local"
    DEFAULT_PROVIDER: str = "openrouter"

    # Optional direct keys
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # Storage paths
    UPLOAD_DIR: Path = ROOT_DIR / "data" / "uploads"
    CHROMA_PERSIST_DIR: Path = ROOT_DIR / "data" / "vectorstore"
    SQLITE_DB_PATH: Path = ROOT_DIR / "data" / "knowflow.db"

    # RAG defaults
    DEFAULT_TOP_K: int = 4
    DEFAULT_SIMILARITY_THRESHOLD: float = 0.25
    DEFAULT_TEMPERATURE: float = 0.2
    CHUNK_SIZE: int = 1200
    CHUNK_OVERLAP: int = 200

    # CORS origins as string or list
    CORS_ORIGINS_STR: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:8000"

    @property
    def CORS_ORIGINS(self) -> List[str]:
        val = self.CORS_ORIGINS_STR.strip()
        if val.startswith("["):
            try:
                return json.loads(val)
            except Exception:
                pass
        return [i.strip() for i in val.split(",") if i.strip()]

    model_config = {
        "env_file": [str(BACKEND_DIR / ".env"), str(ROOT_DIR / ".env")],
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

    def model_post_init(self, __context: Any) -> None:
        if not self.UPLOAD_DIR.is_absolute():
            self.UPLOAD_DIR = (ROOT_DIR / self.UPLOAD_DIR).resolve()
        if not self.CHROMA_PERSIST_DIR.is_absolute():
            self.CHROMA_PERSIST_DIR = (ROOT_DIR / self.CHROMA_PERSIST_DIR).resolve()
        if not self.SQLITE_DB_PATH.is_absolute():
            self.SQLITE_DB_PATH = (ROOT_DIR / self.SQLITE_DB_PATH).resolve()

settings = Settings()

# Ensure required directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)
settings.SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
