import re
import uuid
from pathlib import Path

def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal and unsafe characters.
    """
    clean_name = Path(filename).name
    # Keep alphanumeric, dot, underscore, dash
    clean_name = re.sub(r"[^a-zA-Z0-9._-]", "_", clean_name)
    # Collapse multiple underscores
    clean_name = re.sub(r"_+", "_", clean_name)
    if not clean_name or clean_name.startswith("."):
        clean_name = f"document_{uuid.uuid4().hex[:8]}.pdf"
    return clean_name

def generate_id(prefix: str = "") -> str:
    """
    Generate unique identifier.
    """
    uid = uuid.uuid4().hex
    return f"{prefix}_{uid}" if prefix else uid
