# YouthGuide NA - Web Scraping System

## 🎯 Overview

A modular, maintainable web scraping system for collecting youth opportunities from various Namibian websites. The system is designed to be triggered manually via API call, with all data stored in a single JSON file that the RAG pipeline can directly consume.

---

## 📁 Project Structure

```
youth-guide-na-backend/
├── scrapers/
│   ├── base_scraper.py       # Shared utility functions
│   ├── run_all.py            # Main aggregator script
│   ├── example_scraper.py    # Example scraper (demo)
│   ├── requirements.txt      # Python dependencies
│   └── <site>_scraper.py     # Add more scrapers here
│
├── data/
│   └── opportunities.json    # Final output (auto-generated)
│
└── src/
    └── routes/
        └── scraper.js        # Node.js API endpoints
```

---

## 🚀 Setup

### 1. Install Python Dependencies

```bash
cd scrapers
pip install -r requirements.txt
```

**Required packages:**
- `requests` - HTTP library
- `beautifulsoup4` - HTML parsing
- `lxml` - XML/HTML parser

### 2. Test the Example Scraper

```bash
# From the scrapers directory
python3 example_scraper.py
```

Expected output:
```
[Scraper] Running example_scraper.py...
[Scraper] example_scraper.py returned 7 opportunities

Scraped 7 opportunities:
  - Junior Software Developer (Job) - Tech Namibia
  - Sales Assistant (Job) - Retail Solutions
  ...
```

### 3. Run All Scrapers

```bash
# From the scrapers directory
python3 run_all.py
```

This will:
1. Discover all `*_scraper.py` files
2. Run each scraper
3. Aggregate and clean results
4. Write to `../data/opportunities.json`

---

## 🌐 API Endpoints

### POST /api/scrape
**Trigger manual scraping**

```bash
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "scrapedCount": 142,
  "sources": ["Example Website", "Site1", "Site2"],
  "timestamp": "2025-10-17T10:30:00Z",
  "duration": 5.23,
  "fileSize": 125000,
  "scraperStats": {
    "example_scraper": {
      "count": 7,
      "duration": 0.5
    }
  }
}
```

### GET /api/scrape/status
**Get last scrape info**

```bash
curl http://localhost:3001/api/scrape/status
```

**Response:**
```json
{
  "exists": true,
  "lastUpdated": "2025-10-17T10:30:00Z",
  "totalCount": 142,
  "sources": ["Example Website"],
  "fileSize": 125000
}
```

### GET /api/scrape/data?limit=10
**Get scraped data (debugging)**

```bash
curl http://localhost:3001/api/scrape/data?limit=5
```

Returns the full `opportunities.json` content (or limited subset).

---

## 📝 Creating a New Scraper

### Step 1: Create Scraper File

Create `scrapers/<site_name>_scraper.py`:

```python
"""
Scraper for <Site Name>
Website: https://example-site.com
"""

from base_scraper import (
    fetch_html,
    clean_text,
    extract_date,
    get_opportunity_type,
    format_location,
    generate_id
)
from typing import List, Dict


def scrape() -> List[Dict]:
    """
    Scrape opportunities from <Site Name>
    
    Returns:
        List of opportunity dictionaries
    """
    print("[Scraper] Running <site_name>_scraper.py...")
    
    url = "https://example-site.com/opportunities"
    opportunities = []
    
    # Fetch HTML
    soup = fetch_html(url)
    if not soup:
        return []
    
    # Find opportunity listings
    listings = soup.find_all('div', class_='opportunity-card')
    
    for listing in listings:
        try:
            # Extract data
            title = clean_text(listing.find('h2', class_='title').get_text())
            organization = clean_text(listing.find('span', class_='org').get_text())
            location = format_location(listing.find('span', class_='location').get_text())
            description = clean_text(listing.find('p', class_='desc').get_text())
            
            # Get URL
            link = listing.find('a', class_='link')
            opp_url = link['href'] if link else url
            if not opp_url.startswith('http'):
                opp_url = f"https://example-site.com{opp_url}"
            
            # Extract date
            date_text = listing.find('span', class_='date').get_text()
            date_posted = extract_date(date_text)
            
            # Determine type
            opp_type = get_opportunity_type(title + " " + description)
            
            # Create opportunity object
            opportunity = {
                'id': generate_id(title, 'Example Site', opp_url),
                'source': 'Example Site',
                'title': title,
                'type': opp_type,
                'organization': organization,
                'location': location,
                'description': description,
                'url': opp_url,
                'date_posted': date_posted,
                'verified': True
            }
            
            opportunities.append(opportunity)
            
        except Exception as e:
            print(f"[Scraper] ⚠ Error parsing listing: {str(e)}")
            continue
    
    print(f"[Scraper] <site_name>_scraper.py returned {len(opportunities)} opportunities")
    return opportunities


if __name__ == '__main__':
    # Test the scraper
    results = scrape()
    print(f"\nScraped {len(results)} opportunities")
    for opp in results[:3]:  # Show first 3
        print(f"  - {opp['title']} ({opp['type']})")
```

### Step 2: Test the Scraper

```bash
python3 <site_name>_scraper.py
```

### Step 3: Run Full Aggregation

```bash
python3 run_all.py
```

The new scraper will be automatically discovered and included.

---

## 📊 Output Format

### opportunities.json Structure

```json
{
  "last_updated": "2025-10-17T10:30:00Z",
  "total_count": 142,
  "sources": ["Example Website", "Site1", "Site2"],
  "scraper_stats": {
    "example_scraper": {
      "count": 7,
      "duration": 0.5
    },
    "site1_scraper": {
      "count": 65,
      "duration": 2.1
    }
  },
  "opportunities": [
    {
      "id": "abc123def456",
      "source": "Example Website",
      "title": "Junior Software Developer",
      "type": "Job",
      "organization": "Tech Namibia",
      "location": "Windhoek",
      "description": "We are looking for a junior developer...",
      "url": "https://example.com/jobs/123",
      "date_posted": "2025-10-15",
      "verified": true
    }
  ]
}
```

### Opportunity Types
- `Job` - Employment opportunities
- `Training` - Courses, workshops, programs
- `Scholarship` - Bursaries, grants
- `Internship` - Internship programs

---

## 🛠️ Utility Functions

### Available in `base_scraper.py`:

| Function | Description |
|----------|-------------|
| `fetch_html(url)` | Fetch and parse HTML with BeautifulSoup |
| `clean_text(text)` | Remove HTML, normalize whitespace |
| `extract_date(text)` | Parse various date formats to ISO |
| `generate_id(title, source, url)` | Create unique hash ID |
| `normalize_opportunity(opp)` | Ensure all required fields |
| `remove_duplicates(opps)` | Deduplicate by ID |
| `validate_opportunity(opp)` | Check minimum required data |
| `write_json(data, path)` | Atomic write to JSON |
| `get_opportunity_type(text)` | Determine Job/Training/etc. |
| `format_location(location)` | Normalize location names |

---

## 🔒 Security & Best Practices

### Rate Limiting
Add delays between requests to avoid overwhelming target sites:

```python
import time

for page in range(1, 10):
    soup = fetch_html(f"{base_url}?page={page}")
    # ... scrape page ...
    time.sleep(2)  # 2 second delay
```

### User Agent
The `fetch_html()` function automatically sets a proper User-Agent header.

### Error Handling
Always wrap scraping logic in try/except:

```python
try:
    title = listing.find('h2').get_text()
except (AttributeError, TypeError):
    print("[Scraper] ⚠ Failed to extract title")
    continue
```

### Respect robots.txt
Check the target site's `robots.txt` before scraping:
```
https://example.com/robots.txt
```

---

## 📈 Monitoring & Logging

### Log Levels

The scraper system logs:
- ✓ **Success messages** - Green checkmarks
- ⚠ **Warnings** - Yellow exclamation marks
- ✗ **Errors** - Red X marks

### Example Log Output

```
======================================================================
YouthGuide NA - Opportunity Scraper
======================================================================
Started at: 2025-10-17 10:30:00

[Scraper] Found 2 scraper(s): example_scraper, site1_scraper

[Scraper] Starting example_scraper...
[Scraper] Fetching: https://example.com/opportunities
[Scraper] ✓ Successfully fetched https://example.com/opportunities
[Scraper] example_scraper.py returned 7 opportunities
[Scraper] ✓ example_scraper completed in 0.53s
[Scraper]   Returned 7 items

[Scraper] Starting site1_scraper...
...

[Scraper] Aggregating 72 total items...
[Scraper] 72 opportunities passed validation
[Scraper] Removed 0 duplicates

[Scraper] Writing to /path/to/data/opportunities.json...
[Scraper] ✓ Successfully wrote /path/to/data/opportunities.json
[Scraper]   File size: 125000 bytes

======================================================================
SCRAPING SUMMARY
======================================================================
Total scrapers run: 2
Total items scraped: 72
Final unique items: 72
Sources: Example Website, Site1
Total duration: 3.45s
Output file: /path/to/data/opportunities.json
File written: ✓ Yes

Per-scraper stats:
  • example_scraper: 7 items in 0.53s
  • site1_scraper: 65 items in 2.12s

======================================================================
Completed at: 2025-10-17 10:30:03
======================================================================
```

---

## 🧪 Testing

### Test Individual Scraper

```bash
python3 example_scraper.py
```

### Test Aggregation

```bash
python3 run_all.py
```

### Test via API

```bash
# Start the backend server
npm run dev

# In another terminal
curl -X POST http://localhost:3001/api/scrape
```

---

## 🐛 Troubleshooting

### Python Not Found

**Error:** `Python not found - Python3 is not installed or not in PATH`

**Solution:**
```bash
# Check Python installation
python3 --version

# On Windows, you may need to use 'python' instead
python --version
```

Update `scraper.js` if needed:
```javascript
const pythonProcess = spawn('python', [scraperPath], {
  // ... rest of config
});
```

### Module Import Errors

**Error:** `ModuleNotFoundError: No module named 'requests'`

**Solution:**
```bash
cd scrapers
pip install -r requirements.txt
```

### Permission Errors

**Error:** `PermissionError: [Errno 13] Permission denied`

**Solution:**
```bash
# Make sure data directory is writable
chmod 755 data/
```

### Empty Results

**Check:**
1. Website structure hasn't changed
2. Selectors are correct
3. Network connectivity
4. Rate limiting not blocking requests

---

## 📋 Checklist for Adding New Scrapers

- [ ] Create `<site>_scraper.py` file
- [ ] Implement `scrape()` function
- [ ] Use utility functions from `base_scraper.py`
- [ ] Test scraper independently
- [ ] Verify data structure matches spec
- [ ] Handle errors gracefully
- [ ] Add source name to opportunity objects
- [ ] Test with `run_all.py`
- [ ] Document site-specific quirks
- [ ] Respect site's robots.txt

---

## 🔄 Future Enhancements

### Potential Additions:
- [ ] Scheduled automatic scraping (cron job)
- [ ] Email notifications on scrape completion
- [ ] Webhook support for real-time updates
- [ ] Scraper health monitoring dashboard
- [ ] Historical data tracking
- [ ] Diff detection (new vs updated opportunities)
- [ ] Selenium support for JavaScript-heavy sites
- [ ] Proxy rotation for large-scale scraping
- [ ] Retry logic with exponential backoff

---

## 📚 Resources

- [BeautifulSoup Documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
- [Requests Library](https://requests.readthedocs.io/)
- [Python Path and Module](https://docs.python.org/3/tutorial/modules.html)
- [Node.js child_process](https://nodejs.org/api/child_process.html)

---

## 🤝 Contributing

When adding new scrapers:
1. Follow the existing pattern in `example_scraper.py`
2. Use meaningful variable names
3. Add comments for complex logic
4. Test thoroughly before committing
5. Update this README with site-specific notes

---

*Last updated: October 17, 2025*
