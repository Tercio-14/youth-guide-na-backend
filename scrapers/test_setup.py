#!/usr/bin/env python3
"""
Quick test script to verify scraper setup
"""

import sys
import os

# Add scrapers directory to path
sys.path.insert(0, os.path.dirname(__file__))

print("=" * 70)
print("YouthGuide NA - Scraper Setup Test")
print("=" * 70)

# Test 1: Check Python version
print("\n1. Checking Python version...")
print(f"   Python {sys.version}")
if sys.version_info < (3, 7):
    print("   ✗ Python 3.7+ required")
    sys.exit(1)
print("   ✓ Python version OK")

# Test 2: Check required packages
print("\n2. Checking required packages...")
required_packages = ['requests', 'bs4', 'lxml']
missing_packages = []

for package in required_packages:
    try:
        __import__(package)
        print(f"   ✓ {package}")
    except ImportError:
        print(f"   ✗ {package} not found")
        missing_packages.append(package)

if missing_packages:
    print(f"\n   Missing packages: {', '.join(missing_packages)}")
    print("   Install with: pip install -r requirements.txt")
    sys.exit(1)

# Test 3: Import base_scraper utilities
print("\n3. Testing base_scraper utilities...")
try:
    from base_scraper import (
        fetch_html,
        clean_text,
        extract_date,
        generate_id,
        normalize_opportunity,
        write_json
    )
    print("   ✓ All utilities imported successfully")
except ImportError as e:
    print(f"   ✗ Failed to import utilities: {e}")
    sys.exit(1)

# Test 4: Test utility functions
print("\n4. Testing utility functions...")

# Test clean_text
test_text = "  Hello   World\n\n  "
cleaned = clean_text(test_text)
assert cleaned == "Hello World", "clean_text failed"
print("   ✓ clean_text works")

# Test generate_id
test_id = generate_id("Test Job", "Test Site", "https://test.com")
assert len(test_id) == 16, "generate_id failed"
print("   ✓ generate_id works")

# Test normalize_opportunity
test_opp = {
    'title': 'Test Opportunity',
    'source': 'Test Site'
}
normalized = normalize_opportunity(test_opp)
assert 'id' in normalized, "normalize_opportunity failed"
assert 'verified' in normalized, "normalize_opportunity failed"
print("   ✓ normalize_opportunity works")

# Test 5: Check example scraper
print("\n5. Testing example scraper...")
try:
    import example_scraper
    results = example_scraper.scrape()
    assert isinstance(results, list), "Example scraper should return a list"
    assert len(results) > 0, "Example scraper should return some results"
    print(f"   ✓ Example scraper works ({len(results)} items)")
except Exception as e:
    print(f"   ✗ Example scraper failed: {e}")
    sys.exit(1)

# Test 6: Check data directory
print("\n6. Checking data directory...")
data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
if os.path.exists(data_dir):
    print(f"   ✓ Data directory exists: {os.path.abspath(data_dir)}")
else:
    print(f"   ⚠ Creating data directory...")
    os.makedirs(data_dir, exist_ok=True)
    print(f"   ✓ Data directory created")

# Test 7: Test JSON writing
print("\n7. Testing JSON write...")
test_data = {
    'test': True,
    'timestamp': '2025-10-17T00:00:00Z'
}
test_file = os.path.join(data_dir, 'test.json')
try:
    success = write_json(test_data, test_file)
    assert success, "write_json failed"
    assert os.path.exists(test_file), "Test file not created"
    print("   ✓ JSON write works")
    # Clean up
    os.remove(test_file)
except Exception as e:
    print(f"   ✗ JSON write failed: {e}")
    sys.exit(1)

print("\n" + "=" * 70)
print("✓ All tests passed!")
print("=" * 70)
print("\nSetup is complete. You can now:")
print("  1. Run scrapers: python3 run_all.py")
print("  2. Add new scrapers to this directory")
print("  3. Trigger via API: POST http://localhost:3001/api/scrape")
print()
