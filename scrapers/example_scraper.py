"""
Example scraper for demonstration purposes
Returns dummy data in the correct format
"""

from typing import List, Dict
from datetime import datetime, timedelta
import random


def scrape() -> List[Dict]:
    """
    Example scraper that returns dummy opportunities
    
    Returns:
        List of opportunity dictionaries
    """
    print("[Scraper] Running example_scraper.py...")
    
    # Simulate scraping delay
    import time
    time.sleep(0.5)
    
    # Generate dummy opportunities
    opportunities = []
    
    # Example job listings
    jobs = [
        {
            'title': 'Junior Software Developer',
            'organization': 'Tech Namibia',
            'location': 'Windhoek',
            'description': 'We are looking for a junior developer to join our team. Requirements: Basic knowledge of Python and JavaScript.',
            'type': 'Job',
        },
        {
            'title': 'Sales Assistant',
            'organization': 'Retail Solutions',
            'location': 'Swakopmund',
            'description': 'Full-time sales position in a busy retail store. No experience required, training provided.',
            'type': 'Job',
        },
        {
            'title': 'Security Guard',
            'organization': 'SafeGuard Services',
            'location': 'Walvis Bay',
            'description': 'Night shift security position. Must be 18+ and have PSIRA certificate.',
            'type': 'Job',
        }
    ]
    
    # Example training programs
    trainings = [
        {
            'title': 'Plumbing Skills Training',
            'organization': 'National Youth Service',
            'location': 'Windhoek',
            'description': 'Free 6-month plumbing certification program for youth aged 18-35. All materials provided.',
            'type': 'Training',
        },
        {
            'title': 'Digital Marketing Course',
            'organization': 'Future Skills Academy',
            'location': 'Online',
            'description': 'Learn social media marketing, SEO, and content creation. 8-week online course.',
            'type': 'Training',
        }
    ]
    
    # Example internships
    internships = [
        {
            'title': 'Business Administration Internship',
            'organization': 'City Council',
            'location': 'Windhoek',
            'description': '3-month paid internship in municipal administration. Open to recent graduates.',
            'type': 'Internship',
        }
    ]
    
    # Example scholarships
    scholarships = [
        {
            'title': 'Technical College Bursary',
            'organization': 'Ministry of Education',
            'location': 'Nationwide',
            'description': 'Full bursary for technical and vocational training. Covers tuition and accommodation.',
            'type': 'Scholarship',
        }
    ]
    
    # Combine all examples
    all_examples = jobs + trainings + internships + scholarships
    
    # Generate opportunities with proper structure
    for idx, example in enumerate(all_examples):
        # Generate dates (recent postings)
        days_ago = random.randint(1, 30)
        date_posted = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
        
        # Use actual Namibian job boards or government websites for URLs
        # These are placeholder URLs - should be replaced with actual source URLs
        base_urls = {
            'Job': 'https://jobsinnamibia.info',
            'Training': 'https://www.nta.com.na',
            'Internship': 'https://mti.gov.na',
            'Scholarship': 'https://www.nsfaf.na'
        }
        
        opportunity = {
            'id': f'example_{idx + 1}',
            'source': 'Example Website',
            'title': example['title'],
            'type': example['type'],
            'organization': example['organization'],
            'location': example['location'],
            'description': example['description'],
            # Use the appropriate base URL for the opportunity type
            'url': base_urls.get(example['type'], 'https://jobsinnamibia.info'),
            'date_posted': date_posted,
            'verified': True
        }
        
        opportunities.append(opportunity)
    
    print(f"[Scraper] example_scraper.py returned {len(opportunities)} opportunities")
    
    return opportunities


if __name__ == '__main__':
    # Test the scraper
    results = scrape()
    print(f"\nScraped {len(results)} opportunities:")
    for opp in results:
        print(f"  - {opp['title']} ({opp['type']}) - {opp['organization']}")
