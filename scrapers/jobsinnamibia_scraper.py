"""
JobsInNamibia.info Scraper
==========================

Purpose: Academic research - Youth unemployment study
Target: https://jobsinnamibia.info/
Legal: Public job listings, robots.txt compliant, research fair use

This scraper uses Selenium with Chrome WebDriver to handle dynamic content
and extracts job listings from JobsInNamibia.info for the YouthGuide NA project.

Academic Research:
"Designing an AI Enhanced Chatbot System to Connect Unemployed Youth 
in Havana with Tailored Opportunities"

Rate Limiting: 2-3 second delays between page loads
Max Pages: Configurable (default: 5 for testing, can scrape all 639+ pages)
"""

import sys
import os
import time
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional

# Selenium imports
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

# Import our base scraper utilities
sys.path.append(os.path.dirname(__file__))
from base_scraper import (
    clean_text,
    extract_date,
    generate_id,
    normalize_opportunity,
    format_location,
    get_opportunity_type
)

# Constants
BASE_URL = "https://jobsinnamibia.info"
MAX_PAGES = 5  # Set to None to scrape all pages (639+), or a number for testing
PAGE_LOAD_DELAY = 2  # Seconds between page loads
TIMEOUT = 30  # Seconds to wait for elements


def setup_driver(headless: bool = True) -> webdriver.Chrome:
    """
    Set up Chrome WebDriver with appropriate options.
    
    Args:
        headless: Whether to run in headless mode (no browser window)
    
    Returns:
        Configured Chrome WebDriver instance
    """
    chrome_options = Options()
    
    if headless:
        chrome_options.add_argument("--headless=new")
    
    # Additional options for stability and performance
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (Academic Research Bot)")
    
    # Suppress logging
    chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
    
    try:
        driver = webdriver.Chrome(options=chrome_options)
        driver.set_page_load_timeout(TIMEOUT)
        return driver
    except WebDriverException as e:
        print(f"[Error] Failed to initialize Chrome WebDriver: {e}")
        print("[Info] Make sure chromedriver is installed and in your PATH")
        sys.exit(1)


def get_total_pages(driver: webdriver.Chrome) -> int:
    """
    Extract the total number of pages from pagination.
    
    Args:
        driver: Selenium WebDriver instance
    
    Returns:
        Total number of pages (default 1 if not found)
    """
    try:
        # Wait for pagination to load
        WebDriverWait(driver, TIMEOUT).until(
            EC.presence_of_element_located((By.CLASS_NAME, "pagination"))
        )
        
        # Find all page number links
        page_links = driver.find_elements(By.CSS_SELECTOR, ".pagination .page-numbers")
        
        # Extract numbers and find the maximum
        page_numbers = []
        for link in page_links:
            text = link.text.strip()
            if text.isdigit():
                page_numbers.append(int(text))
        
        if page_numbers:
            total = max(page_numbers)
            print(f"[Scraper] Found {total} total pages")
            return total
        else:
            print("[Warning] Could not determine total pages, defaulting to 1")
            return 1
    
    except TimeoutException:
        print("[Warning] Pagination not found, assuming single page")
        return 1
    except Exception as e:
        print(f"[Warning] Error getting total pages: {e}")
        return 1


def parse_posted_ago(text: str) -> str:
    """
    Parse relative date like "2 days ago" to ISO date.
    
    Args:
        text: Relative date string
    
    Returns:
        ISO formatted date string
    """
    if not text:
        return datetime.now().date().isoformat()
    
    text = text.lower().strip()
    
    try:
        # Pattern: "X days ago", "X hours ago", "X weeks ago", etc.
        match = re.search(r'(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago', text)
        
        if match:
            number = int(match.group(1))
            unit = match.group(2)
            
            if unit == 'second':
                delta = timedelta(seconds=number)
            elif unit == 'minute':
                delta = timedelta(minutes=number)
            elif unit == 'hour':
                delta = timedelta(hours=number)
            elif unit == 'day':
                delta = timedelta(days=number)
            elif unit == 'week':
                delta = timedelta(weeks=number)
            elif unit == 'month':
                delta = timedelta(days=number * 30)
            elif unit == 'year':
                delta = timedelta(days=number * 365)
            else:
                delta = timedelta(days=0)
            
            date = datetime.now() - delta
            return date.date().isoformat()
    
    except Exception as e:
        print(f"[Warning] Could not parse date '{text}': {e}")
    
    return datetime.now().date().isoformat()


def parse_job_listing(article) -> Optional[Dict[str, str]]:
    """
    Extract job details from a single article element.
    
    Args:
        article: Selenium WebElement for the job article
    
    Returns:
        Dictionary with job details, or None if parsing fails
    """
    try:
        # Extract title
        try:
            title_elem = article.find_element(By.CSS_SELECTOR, "h3.loop-item-title a")
            title = clean_text(title_elem.get_attribute("title") or title_elem.text)
            # Remove "Permanent link to:" prefix if present
            title = re.sub(r'^Permanent link to:\s*["\']?', '', title).strip('"\'')
            job_url = title_elem.get_attribute("href")
        except NoSuchElementException:
            print("[Warning] Could not find job title, skipping")
            return None
        
        if not title or not job_url:
            return None
        
        # Extract location
        location = "Namibia"  # Default
        try:
            location_elem = article.find_element(By.CSS_SELECTOR, "span[itemprop='jobLocation'] a")
            location = clean_text(location_elem.text)
            location = format_location(location)
        except NoSuchElementException:
            pass
        
        # Extract closing date
        closing_date = None
        try:
            time_elem = article.find_element(By.CSS_SELECTOR, "time[datetime]")
            datetime_attr = time_elem.get_attribute("datetime")
            if datetime_attr:
                # Try to parse the datetime attribute
                closing_date = extract_date(datetime_attr)
            else:
                # Fallback to text content
                date_text = time_elem.text.strip()
                closing_date = extract_date(date_text)
        except NoSuchElementException:
            pass
        
        # Extract posted ago date
        posted_date = datetime.now().date().isoformat()
        try:
            posted_elem = article.find_element(By.CSS_SELECTOR, "span.job-date-ago")
            posted_ago_text = clean_text(posted_elem.text)
            posted_date = parse_posted_ago(posted_ago_text)
        except NoSuchElementException:
            pass
        
        # Extract category
        category = "General"  # Default
        try:
            category_elem = article.find_element(By.CSS_SELECTOR, "span.job-category a")
            category = clean_text(category_elem.text)
        except NoSuchElementException:
            pass
        
        # Extract description snippet (if available)
        description = f"Category: {category}."
        if closing_date:
            description += f" Closing date: {closing_date}."
        try:
            excerpt_elem = article.find_element(By.CSS_SELECTOR, ".job-excerpt, .entry-content")
            excerpt = clean_text(excerpt_elem.text)
            if excerpt:
                description = excerpt[:200] + ("..." if len(excerpt) > 200 else "")
        except NoSuchElementException:
            pass
        
        # Determine organization from title or category
        organization = "Unknown"
        # Many jobs have format "Position at Company"
        if " at " in title:
            parts = title.split(" at ", 1)
            if len(parts) == 2:
                organization = clean_text(parts[1])
        elif " - " in title:
            parts = title.split(" - ", 1)
            if len(parts) == 2:
                organization = clean_text(parts[1])
        
        # Create job object
        job = {
            "title": title,
            "organization": organization,
            "location": location,
            "description": description,
            "url": job_url,
            "date_posted": posted_date,
            "type": get_opportunity_type(title + " " + category),
            "source": "JobsInNamibia",
            "verified": True
        }
        
        # Generate unique ID
        job["id"] = generate_id(title, "JobsInNamibia", job_url)
        
        return job
    
    except Exception as e:
        print(f"[Warning] Error parsing job listing: {e}")
        return None


def scrape_page(driver: webdriver.Chrome, page_num: int) -> List[Dict[str, str]]:
    """
    Scrape all job listings from a single page.
    
    Args:
        driver: Selenium WebDriver instance
        page_num: Page number to scrape
    
    Returns:
        List of job dictionaries
    """
    jobs = []
    
    try:
        # Construct page URL
        if page_num == 1:
            url = BASE_URL
        else:
            url = f"{BASE_URL}/page/{page_num}/"
        
        print(f"[Scraper] Loading page {page_num}: {url}")
        driver.get(url)
        
        # Wait for job listings to load
        try:
            WebDriverWait(driver, TIMEOUT).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "article.loadmore-item"))
            )
        except TimeoutException:
            print(f"[Warning] Timeout waiting for jobs on page {page_num}")
            return jobs
        
        # Small delay to ensure dynamic content loads
        time.sleep(1)
        
        # Find all job articles
        articles = driver.find_elements(By.CSS_SELECTOR, "article.loadmore-item.noo_job")
        print(f"[Scraper] Found {len(articles)} job listings on page {page_num}")
        
        # Parse each job
        for idx, article in enumerate(articles, 1):
            job = parse_job_listing(article)
            if job:
                jobs.append(job)
            
            # Log progress every 10 jobs
            if idx % 10 == 0:
                print(f"[Scraper] Processed {idx}/{len(articles)} jobs...")
        
        print(f"[Scraper] ✓ Successfully parsed {len(jobs)} jobs from page {page_num}")
    
    except Exception as e:
        print(f"[Error] Failed to scrape page {page_num}: {e}")
    
    return jobs


def scrape(max_pages: Optional[int] = MAX_PAGES) -> List[Dict[str, str]]:
    """
    Main scraping function - scrapes job listings from JobsInNamibia.info.
    
    Args:
        max_pages: Maximum number of pages to scrape (None for all pages)
    
    Returns:
        List of normalized opportunity dictionaries
    """
    print("[Scraper] Starting JobsInNamibia.info scraper...")
    print(f"[Scraper] Target: {BASE_URL}")
    print("[Scraper] Purpose: Academic research - Youth unemployment study")
    print(f"[Scraper] Max pages: {max_pages or 'ALL (639+)'}")
    
    all_jobs = []
    driver = None
    
    try:
        # Set up Selenium driver
        print("[Scraper] Initializing Chrome WebDriver (headless mode)...")
        driver = setup_driver(headless=True)
        
        # Load first page to get total pages
        print(f"[Scraper] Loading homepage: {BASE_URL}")
        driver.get(BASE_URL)
        
        # Get total pages
        total_pages = get_total_pages(driver)
        
        # Determine how many pages to scrape
        if max_pages:
            pages_to_scrape = min(max_pages, total_pages)
        else:
            pages_to_scrape = total_pages
        
        print(f"[Scraper] Will scrape {pages_to_scrape} page(s)")
        print("=" * 70)
        
        # Scrape each page
        for page_num in range(1, pages_to_scrape + 1):
            print(f"\n[Scraper] Processing page {page_num}/{pages_to_scrape}...")
            
            jobs = scrape_page(driver, page_num)
            all_jobs.extend(jobs)
            
            print(f"[Scraper] Total jobs collected so far: {len(all_jobs)}")
            
            # Rate limiting - wait before next page
            if page_num < pages_to_scrape:
                print(f"[Scraper] Waiting {PAGE_LOAD_DELAY}s before next page (rate limiting)...")
                time.sleep(PAGE_LOAD_DELAY)
        
        print("\n" + "=" * 70)
        print(f"[Scraper] ✓ Scraping complete! Total jobs: {len(all_jobs)}")
    
    except KeyboardInterrupt:
        print("\n[Info] Scraping interrupted by user")
    except Exception as e:
        print(f"[Error] Scraping failed: {e}")
    finally:
        # Always close the driver
        if driver:
            print("[Scraper] Closing Chrome WebDriver...")
            driver.quit()
    
    # Normalize all opportunities
    print("[Scraper] Normalizing opportunities...")
    normalized = [normalize_opportunity(job) for job in all_jobs]
    
    return normalized


# Test harness
if __name__ == "__main__":
    print("=" * 70)
    print("JobsInNamibia.info Scraper - Test Run")
    print("=" * 70)
    print("\nAcademic Research Purpose:")
    print("Designing an AI Enhanced Chatbot System to Connect")
    print("Unemployed Youth in Havana with Tailored Opportunities")
    print("=" * 70)
    
    # Run scraper (limit to 2 pages for testing)
    opportunities = scrape(max_pages=2)
    
    if opportunities:
        print("\n" + "=" * 70)
        print("RESULTS SUMMARY")
        print("=" * 70)
        print(f"Total jobs scraped: {len(opportunities)}")
        
        # Show first 3 opportunities
        print(f"\nFirst {min(3, len(opportunities))} opportunities:")
        for i, opp in enumerate(opportunities[:3], 1):
            print(f"\n{i}. {opp['title']}")
            print(f"   Organization: {opp['organization']}")
            print(f"   Location: {opp['location']}")
            print(f"   Type: {opp['type']}")
            print(f"   Posted: {opp['date_posted']}")
            print(f"   URL: {opp['url']}")
        
        # Statistics
        print("\n" + "=" * 70)
        print("STATISTICS")
        print("=" * 70)
        
        organizations = set(opp['organization'] for opp in opportunities if opp['organization'] != 'Unknown')
        print(f"Unique organizations: {len(organizations)}")
        
        locations = set(opp['location'] for opp in opportunities)
        print(f"Unique locations: {len(locations)}")
        print(f"Locations: {', '.join(sorted(locations))}")
        
        types = {}
        for opp in opportunities:
            types[opp['type']] = types.get(opp['type'], 0) + 1
        print(f"\nOpportunity types:")
        for opp_type, count in sorted(types.items()):
            print(f"  - {opp_type}: {count}")
        
        print("\n" + "=" * 70)
        print("✓ Test complete!")
    else:
        print("\n[Error] No opportunities scraped!")
