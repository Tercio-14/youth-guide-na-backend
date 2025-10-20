# 🚀 Quick Start - Web Scraping System

## Step 1: Install Python Dependencies

```powershell
cd scrapers
pip install -r requirements.txt
```

**Expected output:**
```
Successfully installed requests-2.31.0 beautifulsoup4-4.12.0 lxml-4.9.0
```

---

## Step 2: Test the Setup

```powershell
python test_setup.py
```

**Expected output:**
```
======================================================================
YouthGuide NA - Scraper Setup Test
======================================================================

1. Checking Python version...
   Python 3.x.x
   ✓ Python version OK

2. Checking required packages...
   ✓ requests
   ✓ bs4
   ✓ lxml

3. Testing base_scraper utilities...
   ✓ All utilities imported successfully

4. Testing utility functions...
   ✓ clean_text works
   ✓ generate_id works
   ✓ normalize_opportunity works

5. Testing example scraper...
   ✓ Example scraper works (7 items)

6. Checking data directory...
   ✓ Data directory exists

7. Testing JSON write...
   ✓ JSON write works

======================================================================
✓ All tests passed!
======================================================================
```

---

## Step 3: Run the Example Scraper

```powershell
python example_scraper.py
```

**Expected output:**
```
[Scraper] Running example_scraper.py...
[Scraper] example_scraper.py returned 7 opportunities

Scraped 7 opportunities:
  - Junior Software Developer (Job) - Tech Namibia
  - Sales Assistant (Job) - Retail Solutions
  - Security Guard (Job) - SafeGuard Services
  - Plumbing Skills Training (Training) - National Youth Service
  - Digital Marketing Course (Training) - Future Skills Academy
  - Business Administration Internship (Internship) - City Council
  - Technical College Bursary (Scholarship) - Ministry of Education
```

---

## Step 4: Run All Scrapers

```powershell
python run_all.py
```

**Expected output:**
```
======================================================================
YouthGuide NA - Opportunity Scraper
======================================================================
Started at: 2025-10-17 10:30:00

[Scraper] Found 1 scraper(s): example_scraper

[Scraper] Starting example_scraper...
[Scraper] Running example_scraper.py...
[Scraper] example_scraper.py returned 7 opportunities
[Scraper] ✓ example_scraper completed in 0.53s
[Scraper]   Returned 7 items

[Scraper] Aggregating 7 total items...
[Scraper] 7 opportunities passed validation
[Scraper] Removed 0 duplicates

[Scraper] Writing to C:\...\data\opportunities.json...
[Scraper] ✓ Successfully wrote opportunities.json
[Scraper]   File size: 3456 bytes

======================================================================
SCRAPING SUMMARY
======================================================================
Total scrapers run: 1
Total items scraped: 7
Final unique items: 7
Sources: Example Website
Total duration: 0.63s
Output file: C:\...\data\opportunities.json
File written: ✓ Yes

Per-scraper stats:
  • example_scraper: 7 items in 0.53s

======================================================================
Completed at: 2025-10-17 10:30:01
======================================================================
```

---

## Step 5: Check the Output File

```powershell
# View the file
cat ..\data\opportunities.json

# Or open in VS Code
code ..\data\opportunities.json
```

**You should see:**
```json
{
  "last_updated": "2025-10-17T10:30:00Z",
  "total_count": 7,
  "sources": [
    "Example Website"
  ],
  "scraper_stats": {
    "example_scraper": {
      "count": 7,
      "duration": 0.53
    }
  },
  "opportunities": [
    {
      "id": "example_1",
      "source": "Example Website",
      "title": "Junior Software Developer",
      "type": "Job",
      "organization": "Tech Namibia",
      "location": "Windhoek",
      "description": "We are looking for a junior developer...",
      "url": "https://example.com/opportunities/1",
      "date_posted": "2025-10-16",
      "verified": true
    },
    // ... 6 more opportunities
  ]
}
```

---

## Step 6: Test the API (Backend must be running)

### Start the backend server (if not already running):
```powershell
cd ..
npm run dev
```

### In a new terminal, trigger scraping:
```powershell
curl -X POST http://localhost:3001/api/scrape
```

**Expected response:**
```json
{
  "success": true,
  "scrapedCount": 7,
  "sources": ["Example Website"],
  "timestamp": "2025-10-17T10:30:00Z",
  "duration": 0.63,
  "fileSize": 3456,
  "scraperStats": {
    "example_scraper": {
      "count": 7,
      "duration": 0.53
    }
  }
}
```

### Check scraper status:
```powershell
curl http://localhost:3001/api/scrape/status
```

### Get scraped data:
```powershell
curl http://localhost:3001/api/scrape/data?limit=3
```

---

## ✅ Success!

Your web scraping system is now fully operational!

### What You Can Do Now:

1. **Add Real Scrapers**
   - Create `<site_name>_scraper.py` files
   - Copy the pattern from `example_scraper.py`
   - Customize for each website

2. **Trigger Scraping**
   - Via API: `POST /api/scrape`
   - Via command line: `python run_all.py`

3. **Use the Data**
   - Read from `data/opportunities.json`
   - Integrate with your RAG pipeline
   - Display in frontend

---

## 🐛 Troubleshooting

### "Python not found"
- **Windows**: Try `python` instead of `python3`
- **Check installation**: `python --version`

### "Module not found"
- Run: `pip install -r requirements.txt`
- Check: `pip list | findstr requests`

### "Permission denied"
- Run terminal as administrator
- Check `data/` folder permissions

### No output in `opportunities.json`
- Check for errors in `run_all.py` output
- Verify scraper returns a list
- Run individual scraper: `python example_scraper.py`

---

## 📚 Next Steps

1. Read `SCRAPER_SETUP.md` for detailed documentation
2. Review `SCRAPER_IMPLEMENTATION.md` for technical details
3. Create your first real scraper using the template
4. Test and iterate

---

**🎉 Happy Scraping!**
