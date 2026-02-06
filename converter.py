"""
converter.py - Uzbek text conversion between Latin and Cyrillic with DOCX support
"""

import os
import re
import uuid
import shutil
from datetime import datetime
from typing import Tuple, Optional
import aiofiles
from docx import Document
from docx.shared import RGBColor
import asyncio

# Create necessary directories
os.makedirs("uploads", exist_ok=True)
os.makedirs("static/ads", exist_ok=True)


class UzbekConverter:
    """
    Main converter class for Uzbek language
    """
    
    # Latin to Cyrillic mapping (order is important!)
    LATIN_TO_CYRILLIC = [
        # Double letters first (to avoid partial replacements)
        ("sh", "ш"),
        ("ch", "ч"),
        ("ng", "нғ"),
        ("yo", "ё"),
        ("ya", "я"),
        ("yu", "ю"),
        ("ye", "е"),
        ("g‘", "ғ"),
        ("g'", "ғ"),
        ("o‘", "ў"),
        ("o'", "ў"),
        
        # Single letters
        ("a", "а"),
        ("b", "б"),
        ("d", "д"),
        ("e", "е"),
        ("f", "ф"),
        ("g", "г"),
        ("h", "ҳ"),
        ("i", "и"),
        ("j", "ж"),
        ("k", "к"),
        ("l", "л"),
        ("m", "м"),
        ("n", "н"),
        ("o", "о"),
        ("p", "п"),
        ("q", "қ"),
        ("r", "р"),
        ("s", "с"),
        ("t", "т"),
        ("u", "у"),
        ("v", "в"),
        ("x", "х"),
        ("y", "й"),
        ("z", "з"),
        
        # Uppercase
        ("Sh", "Ш"),
        ("Ch", "Ч"),
        ("Ng", "Нғ"),
        ("Yo", "Ё"),
        ("Ya", "Я"),
        ("Yu", "Ю"),
        ("Ye", "Е"),
        ("G‘", "Ғ"),
        ("G'", "Ғ"),
        ("O‘", "Ў"),
        ("O'", "Ў"),
        ("A", "А"),
        ("B", "Б"),
        ("D", "Д"),
        ("E", "Е"),
        ("F", "Ф"),
        ("G", "Г"),
        ("H", "Ҳ"),
        ("I", "И"),
        ("J", "Ж"),
        ("K", "К"),
        ("L", "Л"),
        ("M", "М"),
        ("N", "Н"),
        ("O", "О"),
        ("P", "П"),
        ("Q", "Қ"),
        ("R", "Р"),
        ("S", "С"),
        ("T", "Т"),
        ("U", "У"),
        ("V", "В"),
        ("X", "Х"),
        ("Y", "Й"),
        ("Z", "З"),
    ]
    
    # Cyrillic to Latin mapping
    CYRILLIC_TO_LATIN = [
        # Special combinations first
        ("нғ", "ng"),
        ("ў", "o'"),
        ("ғ", "g'"),
        ("ё", "yo"),
        ("я", "ya"),
        ("ю", "yu"),
        ("е", "ye"),
        ("ш", "sh"),
        ("ч", "ch"),
        
        # Single letters
        ("а", "a"),
        ("б", "b"),
        ("д", "d"),
        ("е", "e"),
        ("ф", "f"),
        ("г", "g"),
        ("ҳ", "h"),
        ("и", "i"),
        ("ж", "j"),
        ("к", "k"),
        ("л", "l"),
        ("м", "m"),
        ("н", "n"),
        ("о", "o"),
        ("п", "p"),
        ("қ", "q"),
        ("р", "r"),
        ("с", "s"),
        ("т", "t"),
        ("у", "u"),
        ("в", "v"),
        ("х", "x"),
        ("й", "y"),
        ("з", "z"),
        
        # Uppercase
        ("Нғ", "Ng"),
        ("Ў", "O'"),
        ("Ғ", "G'"),
        ("Ё", "Yo"),
        ("Я", "Ya"),
        ("Ю", "Yu"),
        ("Е", "Ye"),
        ("Ш", "Sh"),
        ("Ч", "Ch"),
        ("А", "A"),
        ("Б", "B"),
        ("Д", "D"),
        ("Е", "E"),
        ("Ф", "F"),
        ("Г", "G"),
        ("Ҳ", "H"),
        ("И", "I"),
        ("Ж", "J"),
        ("К", "K"),
        ("Л", "L"),
        ("М", "M"),
        ("Н", "N"),
        ("О", "O"),
        ("П", "P"),
        ("Қ", "Q"),
        ("Р", "R"),
        ("С", "S"),
        ("Т", "T"),
        ("У", "U"),
        ("В", "V"),
        ("Х", "X"),
        ("Й", "Y"),
        ("З", "Z"),
    ]
    
    @staticmethod
    def detect_alphabet(text: str) -> str:
        """
        Detect if text is in Latin or Cyrillic alphabet
        Returns: 'latin' or 'cyrillic'
        """
        # Count Cyrillic characters
        cyrillic_chars = re.findall(r'[а-яёўғҳқА-ЯЁЎҒҲҚ]', text)
        cyrillic_count = len(cyrillic_chars)
        
        # Count Latin characters (excluding English-only chars)
        latin_chars = re.findall(r'[a-zA-Z]', text)
        latin_count = len(latin_chars)
        
        if cyrillic_count > latin_count:
            return 'cyrillic'
        else:
            return 'latin'
    
    @staticmethod
    def latin_to_cyrillic(text: str) -> str:
        """
        Convert Latin Uzbek text to Cyrillic
        Removes apostrophes and backticks as required
        """
        # First remove apostrophes and backticks
        text = text.replace("'", "").replace("`", "").replace("‘", "").replace("’", "")
        
        # Perform replacements in order
        for latin, cyrillic in UzbekConverter.LATIN_TO_CYRILLIC:
            text = text.replace(latin, cyrillic)
        
        return text
    
    @staticmethod
    def cyrillic_to_latin(text: str) -> str:
        """
        Convert Cyrillic Uzbek text to Latin
        """
        for cyrillic, latin in UzbekConverter.CYRILLIC_TO_LATIN:
            text = text.replace(cyrillic, latin)
        
        return text
    
    @staticmethod
    def convert_text(text: str) -> Tuple[str, str]:
        """
        Convert text between Latin and Cyrillic
        Returns: (converted_text, direction)
        """
        if not text.strip():
            return text, "none"
        
        alphabet = UzbekConverter.detect_alphabet(text)
        
        if alphabet == 'latin':
            converted = UzbekConverter.latin_to_cyrillic(text)
            direction = "latin_to_cyrillic"
        else:
            converted = UzbekConverter.cyrillic_to_latin(text)
            direction = "cyrillic_to_latin"
        
        return converted, direction


class DocxConverter:
    """
    DOCX file converter with formatting preservation
    """
    
    @staticmethod
    async def save_uploaded_file(file_content: bytes, original_filename: str) -> str:
        """
        Save uploaded DOCX file to uploads directory
        Returns: file path
        """
        # Generate unique filename
        file_id = str(uuid.uuid4())
        extension = os.path.splitext(original_filename)[1] or ".docx"
        filename = f"{file_id}{extension}"
        filepath = os.path.join("uploads", filename)
        
        async with aiofiles.open(filepath, "wb") as f:
            await f.write(file_content)
        
        return filepath
    
    @staticmethod
    def convert_docx_file(input_path: str, output_path: str, direction: str = "auto"):
        """
        Convert DOCX file content between alphabets
        """
        doc = Document(input_path)
        
        # Process all paragraphs
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                # Convert paragraph text
                if direction == "latin_to_cyrillic":
                    converted_text = UzbekConverter.latin_to_cyrillic(paragraph.text)
                elif direction == "cyrillic_to_latin":
                    converted_text = UzbekConverter.cyrillic_to_latin(paragraph.text)
                else:
                    # Auto-detect
                    alphabet = UzbekConverter.detect_alphabet(paragraph.text)
                    if alphabet == 'latin':
                        converted_text = UzbekConverter.latin_to_cyrillic(paragraph.text)
                    else:
                        converted_text = UzbekConverter.cyrillic_to_latin(paragraph.text)
                
                # Clear existing runs and add new text
                paragraph.clear()
                run = paragraph.add_run(converted_text)
                
                # Preserve formatting from first run (if any existed)
                if paragraph.runs and len(paragraph.runs) > 0:
                    original_run = paragraph.runs[0]
                    run.bold = original_run.bold
                    run.italic = original_run.italic
                    run.underline = original_run.underline
                    run.font.size = original_run.font.size
                    run.font.name = original_run.font.name
        
        # Save converted document
        doc.save(output_path)
    
    @staticmethod
    async def convert_docx(
        file_content: bytes, 
        original_filename: str,
        direction: str = "auto"
    ) -> Tuple[Optional[str], Optional[str], str]:
        """
        Main method to convert uploaded DOCX
        Returns: (input_path, output_path, file_id) or (None, None, error_message)
        """
        try:
            # Validate file extension
            if not original_filename.lower().endswith('.docx'):
                return None, None, "Faqat .docx fayllarni yuklash mumkin"
            
            # Save uploaded file
            input_path = await DocxConverter.save_uploaded_file(file_content, original_filename)
            
            # Generate output filename
            file_id = str(uuid.uuid4())
            output_filename = f"converted_{file_id}.docx"
            output_path = os.path.join("uploads", output_filename)
            
            # Convert the document
            DocxConverter.convert_docx_file(input_path, output_path, direction)
            
            return input_path, output_path, file_id
            
        except Exception as e:
            return None, None, f"DOCX konvertatsiyada xatolik: {str(e)}"
    
    @staticmethod
    def cleanup_file(filepath: str):
        """
        Delete a file if it exists
        """
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass


# Background task for automatic file cleanup
async def cleanup_old_files():
    """
    Background task to delete files older than 15 seconds
    """
    while True:
        try:
            now = datetime.now()
            for filename in os.listdir("uploads"):
                filepath = os.path.join("uploads", filename)
                if os.path.isfile(filepath):
                    # Get file modification time
                    mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
                    # Delete if older than 15 seconds
                    if (now - mtime).total_seconds() > 15:
                        try:
                            os.remove(filepath)
                        except:
                            pass
        except:
            pass
        
        # Run every 10 seconds
        await asyncio.sleep(10)


# Utility functions
async def save_ad_image(file_content: bytes, filename: str) -> str:
    """
    Save advertisement image to static/ads directory
    Returns: relative path to image
    """
    # Generate unique filename
    file_id = str(uuid.uuid4())
    extension = os.path.splitext(filename)[1] or ".png"
    new_filename = f"ad_{file_id}{extension}"
    filepath = os.path.join("static", "ads", new_filename)
    
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(file_content)
    
    return f"/static/ads/{new_filename}"


def get_file_size(filepath: str) -> int:
    """
    Get file size in bytes
    """
    try:
        return os.path.getsize(filepath)
    except:
        return 0