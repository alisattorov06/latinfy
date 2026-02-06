"""
database.py - SQLite database models and utilities for Latinify
"""

import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Create database directory if not exists
os.makedirs("data", exist_ok=True)

# SQLite database URL
DATABASE_URL = "sqlite:///data/latinify.db"

# Create engine
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False},
    echo=False  # Set to True for debugging SQL
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


class Advertisement(Base):
    """
    Advertisement model for storing ad data
    """
    __tablename__ = "ads"
    
    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String(500), nullable=False)  # Path to uploaded image
    title_text = Column(String(200), nullable=False)  # Text under image
    redirect_url = Column(String(500), nullable=False)  # URL to redirect on click
    active = Column(Boolean, default=True)  # Is ad active?
    display_delay_seconds = Column(Integer, default=5)  # Delay before showing ad
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "image_path": self.image_path,
            "title_text": self.title_text,
            "redirect_url": self.redirect_url,
            "active": self.active,
            "display_delay_seconds": self.display_delay_seconds,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Settings(Base):
    """
    Global system settings
    """
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True, default=1)
    ads_enabled = Column(Boolean, default=True)  # Global ads switch
    modal_delay_seconds = Column(Integer, default=5)  # Default delay for modal
    
    def to_dict(self):
        return {
            "ads_enabled": self.ads_enabled,
            "modal_delay_seconds": self.modal_delay_seconds
        }


class ConversionLog(Base):
    """
    Optional logging for conversions
    """
    __tablename__ = "conversion_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    conversion_type = Column(String(20), nullable=False)  # 'text' or 'docx'
    text_length = Column(Integer, default=0)  # Character count for text conversions
    file_name = Column(String(255), nullable=True)  # Original filename for docx
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45), nullable=True)  # Client IP (optional)


# Create all tables
def init_db():
    """
    Initialize database and create tables
    """
    Base.metadata.create_all(bind=engine)
    
    # Create default settings if not exists
    db = SessionLocal()
    try:
        if not db.query(Settings).first():
            default_settings = Settings(
                ads_enabled=True,
                modal_delay_seconds=5
            )
            db.add(default_settings)
            db.commit()
            print("✅ Database initialized with default settings")
        else:
            print("✅ Database already initialized")
    finally:
        db.close()


# Dependency to get DB session
def get_db():
    """
    Get database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Helper functions
def get_active_ads(db):
    """
    Get all active advertisements
    """
    return db.query(Advertisement).filter(Advertisement.active == True).all()


def get_random_ad(db):
    """
    Get a random active advertisement
    """
    import random
    active_ads = get_active_ads(db)
    if not active_ads:
        return None
    return random.choice(active_ads)


def get_settings(db):
    """
    Get global settings
    """
    settings = db.query(Settings).first()
    if not settings:
        # Create default settings
        settings = Settings(
            ads_enabled=True,
            modal_delay_seconds=5
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


# Initialize database on import
init_db()