# Chatbot Testing Framework

Comprehensive test suite for validating chatbot responses across different user personas, query types, and data scenarios.

## Overview

This framework tests the chatbot with:
- **8 User Personas**: Diverse user profiles (skilled workers, graduates, students, etc.)
- **6 Query Categories**: Different types of user inputs (searches, conversations, off-topic)
- **2 Data Passes**: Controlled dummy data + real production data
- **~384 Total Tests**: 192 per pass (8 personas × ~24 queries each)

## Test Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     START TEST SUITE                        │
│                  (node run-all-tests.js)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   PASS 1: DUMMY DATA       │
        │   (Controlled Test)        │
        └────────────┬───────────────┘
                     │
                     ├──► Swap dummy-opportunities.json
                     │    (backup real data)
                     │
                     ├──► Test 8 Personas
                     │    └─► Each tests 6 query categories
                     │        └─► ~24 queries per persona
                     │
                     ├──► Analyze responses (0-100 score)
                     │    - Profile consideration
                     │    - Opportunity relevance
                     │    - Response quality
                     │    - Tone appropriateness
                     │
                     ├──► Generate markdown report
                     │    - Pass/fail statistics
                     │    - Individual test results
                     │    - Recommendations
                     │
                     └──► Restore real data
                     │
                     ▼
        ┌────────────────────────────┐
        │   PASS 2: REAL DATA        │
        │   (Production Test)        │
        └────────────┬───────────────┘
                     │
                     ├──► Use actual opportunities.json
                     │
                     ├──► Test 8 Personas (same process)
                     │    └─► Same query categories
                     │
                     ├──► Analyze responses
                     │    - Real-world performance
                     │    - Data coverage analysis
                     │    - Opportunity availability
                     │
                     └──► Generate markdown report
                     │
                     ▼
        ┌────────────────────────────┐
        │   GENERATE SUMMARY         │
        │   (Comparative Analysis)   │
        └────────────┬───────────────┘
                     │
                     ├──► Compare dummy vs real
                     ├──► Extract key metrics
                     ├──► Identify data gaps
                     └──► Final recommendations
                     │
                     ▼
        ┌────────────────────────────┐
        │    REPORTS GENERATED       │
        │    (test-results/)         │
        └────────────────────────────┘
            - dummy-opportunities-test-*.md
            - real-opportunities-test-*.md
            - comprehensive-test-summary-*.md
```

## Quick Start

### Prerequisites

1. Backend server must be running:
   ```bash
   cd youth-guide-na-backend
   node server.js
   ```

2. Server should be accessible at `http://localhost:3000`

3. **IMPORTANT: Disable authentication for testing:**
   
   The tests require authentication to be bypassed. Choose one option:

   **Option 1: Environment variable (recommended for one-time testing)**
   ```bash
   # Windows (PowerShell)
   $env:DISABLE_AUTH_FOR_TESTING="true"; npm run dev

   # Unix/Mac/Linux
   DISABLE_AUTH_FOR_TESTING=true npm run dev
   ```

   **Option 2: Add to .env file (recommended for repeated testing)**
   ```env
   DISABLE_AUTH_FOR_TESTING=true
   ```
   
   Then start server normally:
   ```bash
   npm run dev
   ```

   ⚠️ **WARNING**: Only enable this in development! Never deploy with `DISABLE_AUTH_FOR_TESTING=true`

### Running Tests

**Run all tests (recommended):**
```bash
node test/run-all-tests.js
```

**Run dummy data tests only:**
```bash
node test/run-dummy-data-tests.js
```

**Run real data tests only:**
```bash
node test/run-real-data-tests.js
```

### Test Duration

- **Dummy Data Pass**: ~10-15 minutes
- **Real Data Pass**: ~10-15 minutes
- **Total**: ~20-30 minutes

## Test Structure

### User Personas

1. **Skilled Worker (Sarah)** - Childcare, Sewing, Cleaning skills
2. **IT Graduate (John)** - Computer science degree, programming skills
3. **School Leaver (Maria)** - Just finished Grade 12, looking for first opportunity
4. **Rural Youth (Petrus)** - From rural area, agriculture/construction experience
5. **Hospitality Professional (Linda)** - Customer service, food service experience
6. **Dropout (David)** - Left school early, basic labor skills
7. **Career Changer (Anna)** - Experienced retail worker seeking new field
8. **Student (Michael)** - Current university student seeking part-time/internships

### Query Categories

1. **General Search**: Broad queries ("find me opportunities", "what jobs are available")
2. **Specific Type**: Targeted searches ("scholarships for IT", "internships in Windhoek")
3. **Skill-Based**: Queries mentioning specific skills
4. **Location-Based**: Queries mentioning specific locations
5. **Casual Conversation**: Greetings, questions about the system
6. **Off-Topic**: Questions about unrelated topics (weather, sports)

### Data Sources

**Dummy Data** (`test/dummy-opportunities.json`):
- 20 custom opportunities
- Covers all sectors (childcare, IT, retail, hospitality, etc.)
- Ensures each persona has matching opportunities
- Tests chatbot logic in ideal conditions

**Real Data** (`data/opportunities.json`):
- Production opportunity database
- Tests real-world performance
- Identifies data gaps and coverage issues

## Output

### Report Files

Tests generate markdown reports in `test-results/`:

1. **Dummy Data Report**: `dummy-opportunities-test-[timestamp].md`
   - Tests with controlled data
   - Validates chatbot logic

2. **Real Data Report**: `real-opportunities-test-[timestamp].md`
   - Tests with production data
   - Shows real-world performance

3. **Summary Report**: `comprehensive-test-summary-[timestamp].md`
   - Combines both passes
   - Comparative analysis
   - Overall recommendations

### Report Sections

Each report includes:
- **Test Summary**: Overall pass/fail stats
- **Pass Rate by Category**: Performance per query type
- **Pass Rate by Persona**: Performance per user profile
- **Detailed Results**: Individual test cases with:
  - Query and response
  - Appropriateness score (0-100)
  - Opportunities returned
  - Analysis (strengths and issues)
- **Recommendations**: Actionable improvements

## Scoring System

### Appropriateness Score (0-100)

Tests evaluate responses on:
- **Profile Consideration**: Does response fit user's profile?
- **Opportunity Relevance**: Are returned opportunities appropriate?
- **Response Quality**: Is the response helpful, clear, and concise?
- **Tone**: Is the tone appropriate for the query type?

**Pass Threshold**: 60/100

**Scoring Criteria**:
- 80-100: Excellent
- 60-79: Good
- 40-59: Needs Improvement
- 0-39: Poor

## Framework Files

```
test/
├── chatbot-test-framework.js     # Core testing framework
├── dummy-opportunities.json      # Controlled test data
├── run-dummy-data-tests.js       # Dummy data test runner
├── run-real-data-tests.js        # Real data test runner
├── run-all-tests.js              # Master orchestrator
├── README.md                     # This file
└── test-results/                 # Generated reports (gitignored)
    ├── dummy-opportunities-test-*.md
    ├── real-opportunities-test-*.md
    └── comprehensive-test-summary-*.md
```

## Interpreting Results

### Good Performance
- **Pass Rate > 70%**: Chatbot meets quality standards
- **Dummy ≈ Real**: Consistent performance across data sets
- **Few Issues**: Minimal problems reported

### Areas of Concern
- **Pass Rate < 60%**: Critical issues requiring immediate attention
- **Dummy >> Real**: Data quality/coverage problems
- **High "No Results" Count**: Database gaps for certain personas

### Common Issues

1. **No opportunities returned**: Database lacks relevant opportunities
2. **Wrong opportunity types**: Filtering needs improvement
3. **Too generic responses**: Context not being used effectively
4. **Inappropriate tone**: Response style doesn't match query type
5. **Profile ignored**: User profile not influencing recommendations

## Continuous Testing

### When to Run Tests

- After modifying the RAG pipeline
- After changing prompt templates
- After updating opportunity database
- Before deploying to production
- Weekly as regression tests

### Baseline Metrics

Track these over time:
- Overall pass rate
- Pass rate per persona
- Pass rate per query category
- Average appropriateness score
- Average response time

## Customization

### Adding New Personas

Edit `test/chatbot-test-framework.js`:

```javascript
USER_PERSONAS.push({
  name: 'New Persona',
  description: 'Description',
  profile: {
    ageBracket: '18-24',
    location: 'Windhoek',
    education: 'Grade 12',
    employmentStatus: 'unemployed',
    skills: ['skill1', 'skill2'],
    interests: ['interest1', 'interest2']
  }
});
```

### Adding New Query Types

Edit `test/chatbot-test-framework.js`:

```javascript
QUERY_TYPES.push({
  category: 'new_category',
  expected: 'Expected behavior',
  queries: [
    'Query 1',
    'Query 2 with [skill] placeholder'
  ]
});
```

### Modifying Test Data

Edit `test/dummy-opportunities.json` to add/modify test opportunities.

## Troubleshooting

**Tests fail immediately:**
- Ensure backend server is running on port 3000
- Check Firebase configuration
- Verify API endpoint is accessible

**All tests timeout:**
- Server may be unresponsive
- Check server logs for errors
- Ensure database is accessible

**Low pass rates across the board:**
- Review chatbot prompt templates
- Check RAG pipeline configuration
- Verify opportunity data quality

**Dummy data passes, real data fails:**
- Database likely lacks diverse opportunities
- Add more opportunities matching user profiles
- Improve opportunity metadata and descriptions

## Contributing

When modifying the test framework:
1. Keep persona profiles realistic
2. Use diverse query types
3. Maintain test data quality
4. Document changes
5. Update expected behaviors if logic changes

## Utilities

### Cleanup Old Test Results

```bash
# Keep only the 5 most recent reports of each type
node test/cleanup-test-results.js

# Keep only 3 most recent
node test/cleanup-test-results.js 3

# Keep only 1 most recent
node test/cleanup-test-results.js 1
```

This removes old test reports while preserving the most recent ones, helping manage the `test-results/` directory size.

### Quick Commands

```bash
# Full test suite
npm run test:chatbot           # (add to package.json)
# or
node test/run-all-tests.js

# Individual passes
node test/run-dummy-data-tests.js
node test/run-real-data-tests.js

# Cleanup
node test/cleanup-test-results.js

# View latest reports
ls -lt test-results/           # Unix/Mac
dir test-results /o-d          # Windows
```

## Support

For issues or questions about the testing framework:
1. Review the generated reports for specific failure patterns
2. Check server logs for backend errors
3. Verify test configuration matches your setup
4. Consult the main project documentation
