"""
NIEIS (Namibia Integrated Employment Information System) Scraper
Website: https://nieis.namibiaatwork.gov.na

Academic Research Purpose:
This scraper collects public job data for the research project:
"Designing an AI Enhanced Chatbot System to Connect Unemployed Youth 
in Havana with Tailored Opportunities"

Focus: Windhoek jobs (relevant to Havana, Karas region)
Legal: Complies with robots.txt, Terms of Service, and Namibian Data Protection Act
Ethics: Rate-limited (5-10s delays), non-commercial research use only
"""

import re
import time
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from urllib.parse import urljoin, urlparse, parse_qs

from base_scraper import (
    fetch_html,
    clean_text,
    generate_id,
    format_location
)


def parse_relative_date(date_text: str) -> str:
    """
    Parse relative dates like "1 hour(s) ago" to ISO date
    
    Args:
        date_text: Relative date string
        
    Returns:
        ISO format date string
    """
    if not date_text:
        return datetime.now().strftime('%Y-%m-%d')
    
    date_lower = date_text.lower().strip()
    now = datetime.now()
    
    # Parse patterns like "X hour(s) ago", "X day(s) ago", etc.
    patterns = [
        (r'(\d+)\s*hour', lambda m: now - timedelta(hours=int(m.group(1)))),
        (r'(\d+)\s*day', lambda m: now - timedelta(days=int(m.group(1)))),
        (r'(\d+)\s*week', lambda m: now - timedelta(weeks=int(m.group(1)))),
        (r'(\d+)\s*month', lambda m: now - timedelta(days=int(m.group(1)) * 30)),
        (r'yesterday', lambda m: now - timedelta(days=1)),
        (r'today', lambda m: now),
    ]
    
    for pattern, calculator in patterns:
        match = re.search(pattern, date_lower)
        if match:
            try:
                date = calculator(match)
                return date.strftime('%Y-%m-%d')
            except:
                continue
    
    # Default to today if can't parse
    return now.strftime('%Y-%m-%d')


def extract_search_id(soup) -> Optional[str]:
    """
    Extract searchId from the first page (needed for pagination)
    
    Args:
        soup: BeautifulSoup object of the first page
        
    Returns:
        Search ID string or None
    """
    # Try to find searchId in pagination links
    nav_div = soup.find('div', class_='pageNavigation')
    if nav_div:
        links = nav_div.find_all('a', href=True)
        for link in links:
            href = link['href']
            parsed = parse_qs(urlparse(href).query)
            if 'searchId' in parsed:
                return parsed['searchId'][0]
    
    # Try to find in hidden input
    search_input = soup.find('input', {'name': 'searchId'})
    if search_input and search_input.get('value'):
        return search_input['value']
    
    return None


def parse_job_listing(job_row, base_url: str) -> Optional[Dict]:
    """
    Parse a single job listing from a table row
    
    Args:
        job_row: BeautifulSoup <tr> element
        base_url: Base URL for constructing absolute URLs
        
    Returns:
        Dictionary with job data or None if parsing fails
    """
    try:
        # Find the panel div
        panel = job_row.find('div', class_='panel')
        if not panel:
            return None
        
        # Extract title and detail URL
        title_link = panel.find('a', class_='btn')
        if not title_link:
            return None
        
        title = clean_text(title_link.get_text())
        detail_url = title_link.get('href', '')
        if detail_url and not detail_url.startswith('http'):
            detail_url = urljoin(base_url, detail_url)
        
        # Extract company
        company = "Not specified"
        company_link = job_row.find('a', href=re.compile(r'/company/'))
        if company_link:
            company = clean_text(company_link.get_text())
        
        # Extract location from the col-md-8 or col-md-4 div
        location = "Windhoek"  # Default for this page
        col_divs = job_row.find_all('div', class_=re.compile(r'col-md-\d+'))
        for div in col_divs:
            text = div.get_text()
            # Look for location patterns (city names in Namibia)
            cities = ['Windhoek', 'Swakopmund', 'Walvis Bay', 'Oshakati', 'Rundu', 'Katima Mulilo', 'Rehoboth', 'Keetmanshoop']
            for city in cities:
                if city in text:
                    # Just use the city name, don't include any following text
                    location = city
                    break
        
        location = format_location(location)
        
        # Extract description snippet
        description = ""
        col_md_8 = job_row.find('div', class_='col-md-8')
        if col_md_8:
            # Get text but remove company and location info
            desc_text = col_md_8.get_text()
            # Clean up the description
            lines = [line.strip() for line in desc_text.split('\n') if line.strip()]
            # Filter out company name and location
            lines = [line for line in lines if company not in line and location not in line]
            description = ' '.join(lines[:3])  # Take first 3 relevant lines
        
        description = clean_text(description)
        if not description:
            description = f"Job opportunity at {company} in {location}"
        
        # Extract date
        date_posted = datetime.now().strftime('%Y-%m-%d')
        date_span = job_row.find('span', string=re.compile(r'ago|hour|day|week'))
        if date_span:
            date_text = date_span.get_text()
            date_posted = parse_relative_date(date_text)
        else:
            # Try to find date in icon elements
            clock_icon = job_row.find('i', class_='fa-clock-o')
            if clock_icon and clock_icon.parent:
                date_text = clock_icon.parent.get_text()
                date_posted = parse_relative_date(date_text)
        
        # Create opportunity object
        opportunity = {
            'id': generate_id(title, 'NIEIS', detail_url),
            'source': 'NIEIS',
            'title': title,
            'type': 'Job',  # NIEIS is primarily a job portal
            'organization': company,
            'location': location,
            'description': description,
            'url': detail_url,
            'date_posted': date_posted,
            'verified': True
        }
        
        return opportunity
        
    except Exception as e:
        print(f"[Scraper] ⚠ Error parsing job listing: {str(e)}")
        return None


def scrape() -> List[Dict]:
    """
    Scrape job opportunities from NIEIS Windhoek page
    
    Returns:
        List of opportunity dictionaries
    """
    print("[Scraper] Running nieis_scraper.py...")
    print("[Scraper] Target: NIEIS Windhoek jobs")
    print("[Scraper] Purpose: Academic research - Youth unemployment study")
    
    base_url = 'https://nieis.namibiaatwork.gov.na'
    start_url = f'{base_url}/browse-by-city/windhoek/'
    
    opportunities = []
    max_pages = 5  # Limit to 5 pages to respect rate limits
    
    # Fetch first page to get searchId
    print(f"[Scraper] Fetching initial page: {start_url}")
    soup = fetch_html(start_url)
    
    if not soup:
        print("[Scraper] ✗ Failed to fetch initial page")
        return []
    
    # Extract searchId for pagination
    search_id = extract_search_id(soup)
    if search_id:
        print(f"[Scraper] ✓ Extracted searchId: {search_id}")
    else:
        print("[Scraper] ⚠ Could not extract searchId, will try without it")
    
    # Process pages
    for page_num in range(1, max_pages + 1):
        print(f"\n[Scraper] Processing page {page_num}/{max_pages}...")
        
        # Construct page URL
        if page_num == 1:
            page_url = start_url
            current_soup = soup  # Use already fetched first page
        else:
            # Build pagination URL
            params = [
                f'page={page_num}',
                'view=list',
                'listings_per_page=50',  # Get more results per page
            ]
            if search_id:
                params.insert(1, f'searchId={search_id}')
                params.append('action=search')
            
            page_url = f"{start_url}?{'&'.join(params)}"
            
            # Rate limiting - be respectful (5-10 seconds between requests)
            delay = 7  # 7 seconds delay
            print(f"[Scraper] Waiting {delay}s before next request (rate limiting)...")
            time.sleep(delay)
            
            current_soup = fetch_html(page_url)
            if not current_soup:
                print(f"[Scraper] ✗ Failed to fetch page {page_num}, stopping")
                break
        
        # Find the jobs table
        jobs_tbody = current_soup.find('tbody', class_='searchResultsJobs')
        
        if not jobs_tbody:
            print(f"[Scraper] ⚠ No jobs table found on page {page_num}")
            break
        
        # Find all job rows
        job_rows = jobs_tbody.find_all('tr', class_=re.compile(r'(evenrow|oddrow)'))
        
        if not job_rows:
            print(f"[Scraper] ⚠ No job listings found on page {page_num}, stopping")
            break
        
        print(f"[Scraper] Found {len(job_rows)} job listings on page {page_num}")
        
        # Parse each job
        page_count = 0
        for row in job_rows:
            job = parse_job_listing(row, base_url)
            if job:
                opportunities.append(job)
                page_count += 1
        
        print(f"[Scraper] ✓ Successfully parsed {page_count} jobs from page {page_num}")
        
        # Check for next page link
        nav_div = current_soup.find('div', class_='pageNavigation')
        has_next = False
        if nav_div:
            next_link = nav_div.find('a', string=re.compile(r'Next|›|»', re.IGNORECASE))
            has_next = next_link is not None
        
        if not has_next and page_num < max_pages:
            print(f"[Scraper] ℹ No 'Next' link found, reached last page")
            break
    
    print(f"\n[Scraper] nieis_scraper.py completed")
    print(f"[Scraper] Total opportunities collected: {len(opportunities)}")
    
    return opportunities


if __name__ == '__main__':
    """Test the scraper independently"""
    print("=" * 70)
    print("NIEIS Scraper - Test Run")
    print("=" * 70)
    print("\nAcademic Research Purpose:")
    print("Designing an AI Enhanced Chatbot System to Connect")
    print("Unemployed Youth in Havana with Tailored Opportunities")
    print("=" * 70)
    
    results = scrape()
    
    print(f"\n{'=' * 70}")
    print(f"RESULTS SUMMARY")
    print(f"{'=' * 70}")
    print(f"Total jobs scraped: {len(results)}")
    
    if results:
        print(f"\nFirst 3 opportunities:")
        for i, opp in enumerate(results[:3], 1):
            print(f"\n{i}. {opp['title']}")
            print(f"   Company: {opp['organization']}")
            print(f"   Location: {opp['location']}")
            print(f"   Posted: {opp['date_posted']}")
            print(f"   URL: {opp['url'][:60]}...")
        
        # Show statistics
        companies = set(opp['organization'] for opp in results)
        locations = set(opp['location'] for opp in results)
        
        print(f"\n{'=' * 70}")
        print(f"STATISTICS")
        print(f"{'=' * 70}")
        print(f"Unique companies: {len(companies)}")
        print(f"Unique locations: {len(locations)}")
        print(f"Locations: {', '.join(sorted(locations))}")
    else:
        print("\n⚠ No opportunities were scraped. Check error messages above.")
    
    print(f"\n{'=' * 70}")
