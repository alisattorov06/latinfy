"""
config.py - Configuration settings for Latinify
"""

import os
from typing import Optional

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
STATIC_DIR = os.path.join(BASE_DIR, "static")
ADS_IMAGES_DIR = os.path.join(STATIC_DIR, "ads")
DATA_DIR = os.path.join(BASE_DIR, "data")

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(ADS_IMAGES_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# Application settings
APP_NAME = "Latinify"
APP_VERSION = "1.0.0"
APP_DESCRIPTION = "Uzbek text converter between Latin and Cyrillic alphabets"

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "latinify-secret-key-change-in-production")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")  # Set in environment or generated in main.py

# File upload settings
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_DOCX_EXTENSIONS = {".docx"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_IMAGE_SIZE = 2 * 1024 * 1024  # 2MB

# Advertisement settings
DEFAULT_AD_DELAY = 5  # seconds
DEFAULT_MODAL_DELAY = 5  # seconds
ADS_ENABLED_DEFAULT = True
FILE_CLEANUP_INTERVAL = 15  # seconds

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR}/latinify.db")

# CORS settings
CORS_ORIGINS = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Session settings
SESSION_TIMEOUT = 24 * 60 * 60  # 24 hours in seconds

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.getenv("LOG_FILE", os.path.join(BASE_DIR, "latinify.log"))

# Render.com specific settings (for deployment)
RENDER = os.getenv("RENDER", "false").lower() == "true"
PORT = int(os.getenv("PORT", 8000))

# Feature flags
ENABLE_CONVERSION_LOGGING = True
ENABLE_AD_STATISTICS = True
ENABLE_FILE_CLEANUP = True


def get_admin_token() -> str:
    """
    Get or generate admin token
    """
    import secrets
    return os.getenv("ADMIN_TOKEN", secrets.token_urlsafe(32))


def validate_config() -> Optional[str]:
    """
    Validate configuration and return error message if any
    """
    # Check if upload directory is writable
    if not os.access(UPLOAD_DIR, os.W_OK):
        return f"Upload directory is not writable: {UPLOAD_DIR}"
    
    # Check if static directory exists
    if not os.path.exists(STATIC_DIR):
        return f"Static directory does not exist: {STATIC_DIR}"
    
    return None


# Print config summary on import
if __name__ == "__main__":
    print(f"✅ {APP_NAME} v{APP_VERSION}")
    print(f"📁 Base directory: {BASE_DIR}")
    print(f"📁 Upload directory: {UPLOAD_DIR}")
    print(f"📁 Data directory: {DATA_DIR}")
    print(f"🔐 Admin token: {get_admin_token()[:20]}...")
    
    error = validate_config()
    if error:
        print(f"❌ Configuration error: {error}")
    else:
        print("✅ Configuration validated successfully")