# Fix for Example.com URLs

## Problem
User reported that clicking "View Details" on opportunity cards redirected to `example.com` for some opportunities.

## Root Cause
The `example_scraper.py` was creating test/demo opportunities with fake URLs pointing to `https://example.com/opportunities/{id}`.

## Solution Applied

### 1. Updated Example Scraper
**File**: `scrapers/example_scraper.py`

Changed the URL generation logic to use actual Namibian websites based on opportunity type:

```python
# Use actual Namibian job boards or government websites for URLs
base_urls = {
    'Job': 'https://jobsinnamibia.info',
    'Training': 'https://www.nta.com.na',
    'Internship': 'https://mti.gov.na',
    'Scholarship': 'https://www.nsfaf.na'
}

opportunity = {
    # ... other fields ...
    'url': base_urls.get(example['type'], 'https://jobsinnamibia.info'),
}
```

### 2. Updated Existing Data
**File**: `data/opportunities.json`

Updated all 7 existing example opportunities to use real URLs:

| Opportunity ID | Title | Type | Old URL | New URL |
|---------------|-------|------|---------|---------|
| example_1 | Junior Software Developer | Job | example.com/opportunities/1 | https://jobsinnamibia.info |
| example_2 | Sales Assistant | Job | example.com/opportunities/2 | https://jobsinnamibia.info |
| example_3 | Security Guard | Job | example.com/opportunities/3 | https://jobsinnamibia.info |
| example_4 | Plumbing Skills Training | Training | example.com/opportunities/4 | https://www.nta.com.na |
| example_5 | Digital Marketing Course | Training | example.com/opportunities/5 | https://www.nta.com.na |
| example_6 | Business Admin Internship | Internship | example.com/opportunities/6 | https://mti.gov.na |
| example_7 | Technical College Bursary | Scholarship | example.com/opportunities/7 | https://www.nsfaf.na |

## Verification

Run this command to verify no example.com URLs remain:
```bash
grep -r "example.com" data/opportunities.json
```

Should return: **No matches found** ✅

## Future Prevention

Going forward, the example scraper will automatically use appropriate Namibian websites based on opportunity type:
- **Jobs** → JobsInNamibia.info
- **Training** → National Training Authority (nta.com.na)
- **Internships** → Ministry of Trade & Industry (mti.gov.na)
- **Scholarships** → NSFAF (nsfaf.na)

## Notes

These are still example/demo opportunities from "Example Website" source. They should eventually be replaced with real scraped data or removed entirely if not needed.

The frontend "View Details" button implementation is working correctly - it properly opens the URL from the opportunity data in a new tab with security flags (`noopener,noreferrer`).
