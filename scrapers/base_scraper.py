"""
Base scraper utilities for YouthGuide NA
Shared functions for fetching, cleaning, and saving scraped data
"""

import requests
import json
import re
import os
from datetime import datetime
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import hashlib
import tempfile


def fetch_html(url: str, timeout: int = 60) -> Optional[BeautifulSoup]:
    """
    Fetch HTML content from a URL and parse with BeautifulSoup
    
    Args:
        url: URL to fetch
        timeout: Request timeout in seconds (default: 60s for slow sites)
        
    Returns:
        BeautifulSoup object or None if failed
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        print(f"[Scraper] Fetching: {url}")
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        print(f"[Scraper] ✓ Successfully fetched {url}")
        return soup
        
    except requests.exceptions.RequestException as e:
        print(f"[Scraper] ✗ Error fetching {url}: {str(e)}")
        return None


def clean_text(text: str) -> str:
    """
    Clean and normalize text content
    
    Args:
        text: Raw text to clean
        
    Returns:
        Cleaned text with normalized whitespace
    """
    if not text:
        return ""
    
    # Remove HTML tags if any remain
    text = re.sub(r'<[^>]+>', '', text)
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove leading/trailing whitespace
    text = text.strip()
    
    # Remove special characters that might cause issues
    text = text.replace('\u00a0', ' ')  # non-breaking space
    text = text.replace('\r', '')
    
    return text


def extract_date(raw_text: str) -> Optional[str]:
    """
    Extract and normalize date from text
    
    Args:
        raw_text: Text containing date information
        
    Returns:
        ISO format date string or None
    """
    if not raw_text:
        return None
    
    # Common date patterns
    patterns = [
        # DD/MM/YYYY or DD-MM-YYYY
        (r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', lambda m: f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"),
        # YYYY-MM-DD (already ISO)
        (r'(\d{4})-(\d{1,2})-(\d{1,2})', lambda m: f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"),
        # Month DD, YYYY
        (r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{1,2}),? (\d{4})', 
         lambda m: parse_month_date(m.group(1), m.group(2), m.group(3))),
    ]
    
    for pattern, formatter in patterns:
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if match:
            try:
                return formatter(match)
            except:
                continue
    
    # Default to current date if no date found
    return datetime.now().strftime('%Y-%m-%d')


def parse_month_date(month: str, day: str, year: str) -> str:
    """Helper function to parse month name to ISO date"""
    months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }
    month_num = months.get(month.lower()[:3], '01')
    return f"{year}-{month_num}-{day.zfill(2)}"


def generate_id(title: str, source: str, url: str = "") -> str:
    """
    Generate a unique ID for an opportunity
    
    Args:
        title: Opportunity title
        source: Source website name
        url: URL of the opportunity
        
    Returns:
        Unique hash-based ID
    """
    # Create a unique string from title, source, and URL
    unique_string = f"{source}_{title}_{url}".lower()
    
    # Generate SHA256 hash and take first 16 characters
    hash_object = hashlib.sha256(unique_string.encode())
    return hash_object.hexdigest()[:16]


def normalize_opportunity(opp: Dict) -> Dict:
    """
    Normalize an opportunity dictionary to ensure all required fields exist
    
    Args:
        opp: Raw opportunity dictionary
        
    Returns:
        Normalized opportunity with all required fields
    """
    required_fields = {
        'id': '',
        'source': '',
        'title': '',
        'type': 'Job',  # Default type
        'organization': '',
        'location': 'Namibia',  # Default location
        'description': '',
        'url': '',
        'date_posted': datetime.now().strftime('%Y-%m-%d'),
        'verified': True
    }
    
    # Start with defaults
    normalized = required_fields.copy()
    
    # Update with provided values
    for key, value in opp.items():
        if key in normalized:
            normalized[key] = clean_text(str(value)) if isinstance(value, str) else value
    
    # Generate ID if not provided
    if not normalized['id']:
        normalized['id'] = generate_id(
            normalized['title'],
            normalized['source'],
            normalized['url']
        )
    
    return normalized


def remove_duplicates(opportunities: List[Dict]) -> List[Dict]:
    """
    Remove duplicate opportunities based on ID
    
    Args:
        opportunities: List of opportunity dictionaries
        
    Returns:
        Deduplicated list
    """
    seen_ids = set()
    unique_opps = []
    
    for opp in opportunities:
        opp_id = opp.get('id')
        if opp_id and opp_id not in seen_ids:
            seen_ids.add(opp_id)
            unique_opps.append(opp)
    
    print(f"[Scraper] Removed {len(opportunities) - len(unique_opps)} duplicates")
    return unique_opps


def validate_opportunity(opp: Dict) -> bool:
    """
    Validate that an opportunity has minimum required data
    
    Args:
        opp: Opportunity dictionary
        
    Returns:
        True if valid, False otherwise
    """
    required = ['title', 'source']
    
    for field in required:
        if not opp.get(field) or not str(opp.get(field)).strip():
            return False
    
    return True


def write_json(data: Dict, filepath: str, pretty: bool = True) -> bool:
    """
    Write data to JSON file using atomic write (temp file + rename)
    
    Args:
        data: Dictionary to write
        filepath: Target file path
        pretty: Whether to use pretty printing
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Write to temporary file first
        temp_fd, temp_path = tempfile.mkstemp(
            dir=os.path.dirname(filepath),
            suffix='.tmp'
        )
        
        with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
            if pretty:
                json.dump(data, f, indent=2, ensure_ascii=False)
            else:
                json.dump(data, f, ensure_ascii=False)
        
        # Atomic rename
        os.replace(temp_path, filepath)
        
        print(f"[Scraper] ✓ Successfully wrote {filepath}")
        print(f"[Scraper]   File size: {os.path.getsize(filepath)} bytes")
        return True
        
    except Exception as e:
        print(f"[Scraper] ✗ Error writing {filepath}: {str(e)}")
        # Clean up temp file if it exists
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        return False


def get_opportunity_type(text: str) -> str:
    """
    Determine opportunity type from text
    
    Args:
        text: Text to analyze (title, description, etc.)
        
    Returns:
        One of: Job, Training, Scholarship, Internship
    """
    text_lower = text.lower()
    
    # Check for keywords
    if any(word in text_lower for word in ['internship', 'intern']):
        return 'Internship'
    elif any(word in text_lower for word in ['scholarship', 'bursary', 'grant']):
        return 'Scholarship'
    elif any(word in text_lower for word in ['training', 'course', 'workshop', 'program', 'programme', 'certification']):
        return 'Training'
    else:
        return 'Job'


def format_location(location: str) -> str:
    """
    Normalize location string
    
    Args:
        location: Raw location text
        
    Returns:
        Cleaned location string
    """
    if not location:
        return 'Namibia'
    
    # Common city names in Namibia
    cities = {
        'whk': 'Windhoek',
        'wdh': 'Windhoek',
        'swk': 'Swakopmund',
        'wal': 'Walvis Bay',
        'osh': 'Oshakati',
        'run': 'Rundu',
        'kat': 'Katima Mulilo'
    }
    
    location_clean = clean_text(location)
    
    # Replace abbreviations
    for abbr, full in cities.items():
        if abbr in location_clean.lower():
            return full
    
    return location_clean or 'Namibia'


# Export all utility functions
__all__ = [
    'fetch_html',
    'clean_text',
    'extract_date',
    'generate_id',
    'normalize_opportunity',
    'remove_duplicates',
    'validate_opportunity',
    'write_json',
    'get_opportunity_type',
    'format_location'
]
