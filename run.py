#!/usr/bin/env python3
"""
run.py - Launch script for Latinify
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import PORT, RENDER, validate_config


def main():
    """
    Main entry point for running the application
    """
    print("🚀 Starting Latinify...")
    print(f"📁 Working directory: {os.getcwd()}")
    
    # Validate configuration
    error = validate_config()
    if error:
        print(f"❌ Configuration error: {error}")
        sys.exit(1)
    
    # Check for required files
    required_files = ["main.py", "database.py", "converter.py", "requirements.txt"]
    missing_files = []
    
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ Missing required files: {', '.join(missing_files)}")
        sys.exit(1)
    
    print("✅ All required files found")
    
    # Check if database exists, if not create it
    from database import init_db
    init_db()
    
    # Install dependencies check
    try:
        import fastapi
        import sqlalchemy
        import python_docx
        print("✅ All dependencies are installed")
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("   Install dependencies with: pip install -r requirements.txt")
        sys.exit(1)
    
    # Determine host and port
    host = "0.0.0.0" if RENDER else "127.0.0.1"
    
    print(f"🌐 Starting server on {host}:{PORT}")
    print(f"📊 Admin panel: http://{host}:{PORT}/admin")
    print(f"👤 User interface: http://{host}:{PORT}/")
    print("🔑 Admin token will be printed in the console")
    print("🔄 Server is starting... (Press Ctrl+C to stop)")
    print("-" * 50)
    
    # Run the application
    uvicorn.run(
        "main:app",
        host=host,
        port=PORT,
        reload=not RENDER,  # Disable reload on Render
        log_level="info",
        access_log=True
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)