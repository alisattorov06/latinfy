"""
main.py - FastAPI backend for Latinify platform
Combines all routes: user API, admin panel, and static files
"""

import os
import secrets
import asyncio
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, Request, Response, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import aiofiles

from database import (
    get_db, Advertisement, Settings, ConversionLog, 
    get_active_ads, get_random_ad, get_settings
)
from converter import (
    UzbekConverter, DocxConverter, save_ad_image, 
    get_file_size, cleanup_old_files
)

# Initialize FastAPI
app = FastAPI(title="Latinify", version="1.0.0")

# Create necessary directories
os.makedirs("templates", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/ads", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

# Templates
templates = Jinja2Templates(directory="templates")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Admin token (in production use environment variable)
ADMIN_TOKEN = secrets.token_urlsafe(32)
print(f"🔐 Admin access token: {ADMIN_TOKEN}")

# Session storage for shown ads (in production use Redis)
user_sessions = {}

# Start background cleanup task
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_old_files())


# ======================
# HELPER FUNCTIONS
# ======================

def get_user_session(request: Request) -> dict:
    """
    Get or create user session
    """
    session_id = request.cookies.get("session_id")
    if not session_id or session_id not in user_sessions:
        session_id = secrets.token_urlsafe(16)
        user_sessions[session_id] = {
            "shown_ads": [],
            "created_at": datetime.now()
        }
    
    return session_id, user_sessions[session_id]


def verify_admin_token(token: str) -> bool:
    """
    Verify admin token
    """
    return token == ADMIN_TOKEN


async def log_conversion(
    db: Session, 
    conversion_type: str, 
    text_length: int = 0, 
    file_name: Optional[str] = None,
    request: Optional[Request] = None
):
    """
    Log conversion activity
    """
    log = ConversionLog(
        conversion_type=conversion_type,
        text_length=text_length,
        file_name=file_name,
        ip_address=request.client.host if request else None
    )
    db.add(log)
    db.commit()


# ======================
# USER ROUTES
# ======================

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """
    Main user interface
    """
    # Get user session
    session_id, session_data = get_user_session(request)
    
    # Get settings
    db = next(get_db())
    settings = get_settings(db)
    
    # Prepare response with session cookie
    response = templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "ads_enabled": settings.ads_enabled,
            "modal_delay": settings.modal_delay_seconds
        }
    )
    
    # Set session cookie if not present
    if not request.cookies.get("session_id"):
        response.set_cookie(key="session_id", value=session_id, httponly=True)
    
    return response


@app.post("/api/convert-text")
async def convert_text_api(
    request: Request,
    text: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Convert text between Latin and Cyrillic
    """
    if not text.strip():
        return JSONResponse({"error": "Matn kiriting"}, status_code=400)
    
    # Convert text
    converted_text, direction = UzbekConverter.convert_text(text)
    
    # Log conversion
    await log_conversion(db, "text", len(text), None, request)
    
    return JSONResponse({
        "original": text,
        "converted": converted_text,
        "direction": direction
    })


@app.post("/api/upload-docx")
async def upload_docx(
    request: Request,
    file: UploadFile = File(...),
    direction: str = Form("auto"),
    db: Session = Depends(get_db)
):
    """
    Upload and convert DOCX file
    """
    # Validate file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        return JSONResponse({"error": "Fayl hajmi 5MB dan oshmasligi kerak"}, status_code=400)
    
    # Convert DOCX
    input_path, output_path, file_id = await DocxConverter.convert_docx(
        content, file.filename, direction
    )
    
    if not file_id or not output_path:
        return JSONResponse({"error": "Faylni konvert qilishda xatolik"}, status_code=400)
    
    # Log conversion
    await log_conversion(db, "docx", 0, file.filename, request)
    
    return JSONResponse({
        "success": True,
        "file_id": file_id,
        "filename": f"converted_{os.path.basename(file.filename)}",
        "message": "Fayl muvaffaqiyatli konvert qilindi"
    })


@app.get("/api/download/{file_id}")
async def download_file(file_id: str):
    """
    Download converted DOCX file
    """
    filepath = os.path.join("uploads", f"converted_{file_id}.docx")
    
    if not os.path.exists(filepath):
        return JSONResponse({"error": "Fayl topilmadi"}, status_code=404)
    
    return FileResponse(
        filepath,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"latinify_converted_{file_id}.docx"
    )


@app.get("/api/get-ad")
async def get_advertisement(request: Request, db: Session = Depends(get_db)):
    """
    Get random advertisement for user
    """
    # Get user session
    session_id, session_data = get_user_session(request)
    
    # Get settings
    settings = get_settings(db)
    
    if not settings.ads_enabled:
        return JSONResponse({"ad": None})
    
    # Get random active ad
    ad = get_random_ad(db)
    if not ad:
        return JSONResponse({"ad": None})
    
    # Check if user has already seen this ad
    if ad.id in session_data.get("shown_ads", []):
        return JSONResponse({"ad": None})
    
    # Mark ad as shown for this session
    session_data.setdefault("shown_ads", []).append(ad.id)
    user_sessions[session_id] = session_data
    
    return JSONResponse({
        "ad": {
            "id": ad.id,
            "image_url": ad.image_path,
            "title": ad.title_text,
            "redirect_url": ad.redirect_url,
            "delay_seconds": ad.display_delay_seconds
        }
    })


# ======================
# ADMIN ROUTES (PROTECTED)
# ======================

@app.get("/admin", response_class=HTMLResponse)
async def admin_panel(request: Request, token: Optional[str] = None):
    """
    Admin dashboard
    """
    if not token or not verify_admin_token(token):
        return HTMLResponse("""
        <html>
            <body style="font-family: Arial; padding: 50px; text-align: center;">
                <h1>Admin Panel</h1>
                <form method="get">
                    <input type="password" name="token" placeholder="Admin token" 
                           style="padding: 10px; width: 300px; margin: 10px;">
                    <br>
                    <button type="submit" style="padding: 10px 20px; background: #3b82f6; color: white; border: none;">
                        Kirish
                    </button>
                </form>
            </body>
        </html>
        """)
    
    return templates.TemplateResponse("admin.html", {"request": request})


@app.get("/admin/settings", response_class=HTMLResponse)
async def admin_settings(request: Request, token: str):
    """
    Admin settings page
    """
    if not verify_admin_token(token):
        return RedirectResponse("/admin")
    
    return templates.TemplateResponse("settings.html", {"request": request})


# ======================
# ADMIN API ROUTES
# ======================

@app.get("/api/admin/ads")
async def get_all_ads(token: str, db: Session = Depends(get_db)):
    """
    Get all advertisements
    """
    if not verify_admin_token(token):
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan")
    
    ads = db.query(Advertisement).order_by(Advertisement.created_at.desc()).all()
    return JSONResponse({"ads": [ad.to_dict() for ad in ads]})


@app.post("/api/admin/ads/create")
async def create_ad(
    token: str = Form(...),
    title_text: str = Form(...),
    redirect_url: str = Form(...),
    display_delay_seconds: int = Form(5),
    active: bool = Form(True),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Create new advertisement
    """
    if not verify_admin_token(token):
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan")
    
    # Validate image
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Faqat rasm fayllari")
    
    # Save image
    image_content = await image.read()
    if len(image_content) > 2 * 1024 * 1024:  # 2MB limit
        raise HTTPException(status_code=400, detail="Rasm hajmi 2MB dan oshmasligi kerak")
    
    image_path = await save_ad_image(image_content, image.filename)
    
    # Create ad
    ad = Advertisement(
        image_path=image_path,
        title_text=title_text,
        redirect_url=redirect_url,
        display_delay_seconds=display_delay_seconds,
        active=active
    )
    
    db.add(ad)
    db.commit()
    db.refresh(ad)
    
    return JSONResponse({"success": True, "ad": ad.to_dict()})


@app.put("/api/admin/ads/{ad_id}/toggle")
async def toggle_ad(
    ad_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Toggle ad active status
    """
    if not verify_admin_token(token):
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan")
    
    ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Reklama topilmadi")
    
    ad.active = not ad.active
    db.commit()
    
    return JSONResponse({"success": True, "active": ad.active})


@app.delete("/api/admin/ads/{ad_id}")
async def delete_ad(
    ad_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    """
    Delete advertisement
    """
    if not verify_admin_token(token):
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan")
    
    ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Reklama topilmadi")
    
    # Delete image file if exists
    if ad.image_path and ad.image_path.startswith("/static/ads/"):
        image_path = ad.image_path[1:]  # Remove leading slash
        if os.path.exists(image_path):
            os.remove(image_path)
    
    db.delete(ad)
    db.commit()
    
    return JSONResponse({"success": True})


@app.get("/api/admin/settings")
async def get_admin_settings(token: str, db: Session = Depends(get_db)):
    """
    Get current settings
    """
    if not verify_admin_token(token):
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan")
    
    settings = get_settings(db)
    return JSONResponse({"settings": settings.to_dict()})


@app.put("/api/admin/settings")
async def update_settings(
    token: str,
    ads_enabled: bool = Form(...),
    modal_delay_seconds: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Update global settings
    """
    if not verify_admin_token(token):
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan")
    
    settings = db.query(Settings).first()
    if not settings:
        settings = Settings()
        db.add(settings)
    
    settings.ads_enabled = ads_enabled
    settings.modal_delay_seconds = modal_delay_seconds
    
    db.commit()
    
    return JSONResponse({"success": True, "settings": settings.to_dict()})


@app.get("/api/admin/stats")
async def get_stats(token: str, db: Session = Depends(get_db)):
    """
    Get platform statistics
    """
    if not verify_admin_token(token):
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan")
    
    total_ads = db.query(Advertisement).count()
    active_ads = db.query(Advertisement).filter(Advertisement.active == True).count()
    total_conversions = db.query(ConversionLog).count()
    
    # Recent conversions
    recent_conversions = db.query(ConversionLog)\
        .order_by(ConversionLog.timestamp.desc())\
        .limit(10)\
        .all()
    
    return JSONResponse({
        "stats": {
            "total_ads": total_ads,
            "active_ads": active_ads,
            "total_conversions": total_conversions
        },
        "recent_conversions": [
            {
                "type": conv.conversion_type,
                "filename": conv.file_name,
                "timestamp": conv.timestamp.isoformat(),
                "ip": conv.ip_address
            }
            for conv in recent_conversions
        ]
    })


# ======================
# HEALTH CHECK
# ======================

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ======================
# ERROR HANDLERS
# ======================

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "Sahifa topilmadi"}
    )


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": "Server xatosi"}
    )


# ======================
# RUN APPLICATION
# ======================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )