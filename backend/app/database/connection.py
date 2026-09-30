from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.database.models import Base

# SQLite connection URL
SQLALCHEMY_DATABASE_URL = f"sqlite:///{settings.SQLITE_DB_PATH.as_posix()}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite multi-threading
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    # Safely migrate existing messages table if columns are missing
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE messages ADD COLUMN mode VARCHAR(32) DEFAULT 'document'"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE messages ADD COLUMN document_support VARCHAR(32) DEFAULT 'full'"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE messages ADD COLUMN provider VARCHAR(32) DEFAULT 'openrouter'"))
            conn.commit()
        except Exception:
            pass

# Automatically ensure tables exist on module import
init_db()
