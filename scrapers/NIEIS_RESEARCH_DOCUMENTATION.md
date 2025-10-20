# NIEIS Scraper - Research Documentation

## 📚 Academic Research Context

**Project Title:**  
"Designing an AI Enhanced Chatbot System to Connect Unemployed Youth in Havana with Tailored Opportunities"

**Institution:** [Your University]  
**Researcher:** [Your Name]  
**Purpose:** Academic research on youth unemployment in Havana, Windhoek, Namibia

---

## 🎯 Research Objectives

### Main Objective
Develop a RAG-based chatbot prototype to help unemployed youth in Havana find tailored job and educational opportunities.

### Sub-Objectives
1. Create a prototype with user profiles and dynamic database for personalized matching
2. Use participatory design with youth for usability and adoption
3. Test effectiveness, fairness, and potential biases in the system
4. Address skills mismatch and information access barriers

### Research Questions
1. How can an AI chatbot effectively match opportunities to youth skills/qualifications?
2. How can participatory design be structured to maximize adoption?
3. To what extent can the system improve access and reduce unemployment?
4. What are the barriers and enablers in rural contexts like Havana?

---

## ⚖️ Legal & Ethical Justification

### Robots.txt Compliance
- **Checked:** https://nieis.namibiaatwork.gov.na/robots.txt
- **Result:** Only `/files/files/` is disallowed
- **Job pages:** Allowed for crawling
- **Status:** ✅ Compliant

### Terms of Service
- **Reviewed:** NIEIS website terms
- **Anti-scraping clauses:** None found
- **Usage restrictions:** No explicit prohibition on research use
- **Status:** ✅ Compliant

### Namibian Law
- **Data Protection Act:** Applies to personal data
- **Data Scraped:** Public job listings (non-personal data)
- **Personal Information:** None (no names, emails, resumes, phone numbers)
- **Status:** ✅ Legal

### Ethical Considerations
- ✅ **Rate Limited:** 5-10 second delays between requests
- ✅ **Minimal Impact:** Low request volume, off-peak hours
- ✅ **Non-Commercial:** Research purposes only
- ✅ **Fair Use:** Educational/academic research exception
- ✅ **No Authentication:** No logins or password-protected areas
- ✅ **Public Data Only:** No scraping of user profiles or resumes
- ✅ **Temporary Storage:** Data deleted after research completion
- ✅ **Transparency:** Proper User-Agent identification

---

## 🌐 Website Details

### Target URL
**Base:** https://nieis.namibiaatwork.gov.na  
**Focus:** https://nieis.namibiaatwork.gov.na/browse-by-city/windhoek/

**Why Windhoek?**  
Havana is in the Karas region, and most opportunities relevant to rural youth are posted in the capital, Windhoek.

### Technical Details

#### Pagination
- **Format:** `?page=[number]&view=list&searchId=[ID]&action=search`
- **Per Page:** `&listings_per_page=50` (default: 10, max: 100)
- **Sorting:** `&sorting_field=activation_date&sorting_order=ASC`

#### HTML Structure
```html
<table class="table table-responsive table-striped">
  <tbody class="searchResultsJobs">
    <tr class="evenrow"> <!-- or "oddrow" -->
      <td>
        <div class="panel panel-primary">
          <a class="btn btn-default panel-heading" href="/display-job/...">
            [Job Title]
          </a>
          <div class="panel-body">
            <div class="col-md-8">
              <a href="/company/.../">[Company Name]</a>
              [Location]
              [Description snippet]
              <span><i class="fa fa-clock-o"></i> [Time ago]</span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

#### Key Selectors
- **Jobs Table:** `tbody.searchResultsJobs`
- **Job Row:** `tr.evenrow`, `tr.oddrow`
- **Title:** `a.btn.btn-default.panel-heading`
- **Company:** `a[href^="/company/"]`
- **Date:** `span` containing clock icon + "ago" text
- **Pagination:** `div.pageNavigation > a`

---

## 🛠️ Scraper Implementation

### Features
- ✅ Respects rate limits (7-second delays)
- ✅ Extracts searchId for pagination
- ✅ Parses relative dates ("2 hours ago" → ISO date)
- ✅ Handles location variations
- ✅ Error handling and graceful failures
- ✅ Proper User-Agent headers
- ✅ Limited to 5 pages (configurable)
- ✅ Comprehensive logging

### Data Extracted
| Field | Description | Example |
|-------|-------------|---------|
| `title` | Job title | "Front of House Supervisor" |
| `organization` | Company name | "Hartlief Corporation Ltd" |
| `location` | City/region | "Windhoek, KH" |
| `date_posted` | ISO date | "2025-10-17" |
| `description` | Job snippet | "PURPOSE OF THE POSITION: To lead..." |
| `url` | Detail page link | "https://nieis.namibiaatwork.gov.na/display-job/..." |
| `type` | Opportunity type | "Job" |
| `verified` | Data source verified | `true` |

### Rate Limiting Strategy
```python
# 7-second delay between requests
time.sleep(7)

# This translates to:
# - ~8 requests per minute
# - ~480 requests per hour
# - Well below any reasonable rate limit
```

### Error Handling
- ❌ **Failed request:** Log error, skip page, continue
- ❌ **Parsing error:** Log warning, skip item, continue
- ❌ **Missing searchId:** Continue without it (may limit pagination)
- ❌ **No next page:** Stop gracefully

---

## 📊 Expected Output

### Sample Job Object
```json
{
  "id": "a1b2c3d4e5f6g7h8",
  "source": "NIEIS",
  "title": "Front of House Supervisor",
  "type": "Job",
  "organization": "Hartlief Corporation Ltd",
  "location": "Windhoek",
  "description": "PURPOSE OF THE POSITION: To lead and supervise the front of house operations ensuring excellent customer service...",
  "url": "https://nieis.namibiaatwork.gov.na/display-job/787363/Front-of-House-Supervisor.html",
  "date_posted": "2025-10-17",
  "verified": true
}
```

### Aggregated Output (opportunities.json)
```json
{
  "last_updated": "2025-10-17T10:30:00Z",
  "total_count": 142,
  "sources": ["NIEIS", "Example Website"],
  "scraper_stats": {
    "nieis_scraper": {
      "count": 135,
      "duration": 45.23
    }
  },
  "opportunities": [...]
}
```

---

## 🧪 Testing

### Independent Test
```bash
cd scrapers
python nieis_scraper.py
```

**Expected Output:**
```
======================================================================
NIEIS Scraper - Test Run
======================================================================

Academic Research Purpose:
Designing an AI Enhanced Chatbot System to Connect
Unemployed Youth in Havana with Tailored Opportunities
======================================================================
[Scraper] Running nieis_scraper.py...
[Scraper] Target: NIEIS Windhoek jobs
[Scraper] Purpose: Academic research - Youth unemployment study
[Scraper] Fetching initial page: https://nieis.namibiaatwork.gov.na/browse-by-city/windhoek/
[Scraper] ✓ Successfully fetched ...
[Scraper] ✓ Extracted searchId: [ID]

[Scraper] Processing page 1/5...
[Scraper] Found 50 job listings on page 1
[Scraper] ✓ Successfully parsed 48 jobs from page 1

[Scraper] Waiting 7s before next request (rate limiting)...

...

======================================================================
RESULTS SUMMARY
======================================================================
Total jobs scraped: 135

First 3 opportunities:
1. Front of House Supervisor
   Company: Hartlief Corporation Ltd
   Location: Windhoek
   Posted: 2025-10-17
   URL: https://nieis.namibiaatwork.gov.na/display-job/...

...

======================================================================
STATISTICS
======================================================================
Unique companies: 67
Unique locations: Windhoek, Swakopmund, Walvis Bay
Locations: Swakopmund, Walvis Bay, Windhoek
```

### Full System Test
```bash
python run_all.py
```

---

## 📖 Literature References

### Youth Unemployment in Namibia
- Samuel et al. (2017) - Youth unemployment in Windhoek
- NPC (2020) - National Planning Commission reports
- Relevant studies on Havana/Karas region

### AI Chatbots for Employment
- Vaidheeswaran & Nathan (2024) - AI chatbot applications
- Hashiyana & Kamati (2025) - Technology adoption in Namibia

### Ethics & Fairness
- Zytko et al. (2022) - AI ethics in developing contexts
- Data protection considerations

---

## 🔒 Data Protection & Privacy

### Personal Data
**Scraped:** ❌ None  
**Avoided:** Names, emails, phone numbers, resumes, login credentials

### Data Storage
- **Location:** Local server (backend/data/opportunities.json)
- **Duration:** Temporary (deleted after research)
- **Access:** Restricted to research team
- **Backup:** No cloud storage

### Data Usage
- ✅ RAG system training/testing
- ✅ Chatbot matching algorithm
- ✅ Research analysis
- ❌ Commercial purposes
- ❌ Redistribution
- ❌ Public release

---

## 📋 Compliance Checklist

- [x] Robots.txt reviewed and compliant
- [x] Terms of Service reviewed
- [x] No personal data scraped
- [x] Rate limiting implemented (7s delays)
- [x] Proper User-Agent set
- [x] No authentication bypass
- [x] Error handling in place
- [x] Academic research justification documented
- [x] Data deletion plan established
- [x] Minimal server impact ensured
- [x] Focus on public data only
- [x] Namibian law compliance verified

---

## 🚫 Restrictions & Limitations

### Do NOT
- ❌ Scrape user profiles or resumes
- ❌ Access password-protected areas
- ❌ Overwhelm servers (no parallel requests)
- ❌ Use data commercially
- ❌ Redistribute scraped data
- ❌ Scrape more frequently than necessary
- ❌ Bypass CAPTCHAs or rate limits

### DO
- ✅ Respect rate limits (7s delays)
- ✅ Use proper User-Agent
- ✅ Handle errors gracefully
- ✅ Log all activities
- ✅ Limit scope (Windhoek only)
- ✅ Delete data after research
- ✅ Cite NIEIS as data source

---

## 🤝 Acknowledgments

**Data Source:** NIEIS (Namibia Integrated Employment Information System)  
**URL:** https://nieis.namibiaatwork.gov.na  
**Purpose:** Public service connecting job seekers with employers in Namibia

**Research Beneficiaries:** Unemployed youth in Havana, Karas region

---

## 📞 Contact

For questions about this research or data usage:
- **Researcher:** [Your Name]
- **Email:** [Your Email]
- **Institution:** [Your University]
- **Ethics Approval:** [Reference Number if applicable]

---

**Last Updated:** October 17, 2025  
**Version:** 1.0  
**Status:** Active Research
