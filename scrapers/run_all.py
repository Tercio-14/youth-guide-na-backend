"""
YouthGuide NA - Scraper Aggregator
Runs all scrapers, merges results, and writes to opportunities.json
"""

import os
import sys
import importlib
from datetime import datetime
from typing import List, Dict
import traceback

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import (
    normalize_opportunity,
    remove_duplicates,
    validate_opportunity,
    write_json
)


def discover_scrapers() -> List[str]:
    """
    Discover all scraper modules in the scrapers directory
    
    Returns:
        List of scraper module names (without .py extension)
    """
    scraper_dir = os.path.dirname(__file__)
    scrapers = []
    
    for filename in os.listdir(scraper_dir):
        # Skip non-Python files and special files
        if not filename.endswith('.py'):
            continue
        if filename.startswith('__'):
            continue
        if filename in ['base_scraper.py', 'run_all.py']:
            continue
        
        # Add scraper module name (without .py)
        module_name = filename[:-3]
        scrapers.append(module_name)
    
    return sorted(scrapers)


def run_scraper(module_name: str) -> tuple[List[Dict], float]:
    """
    Run a single scraper module
    
    Args:
        module_name: Name of the scraper module
        
    Returns:
        Tuple of (opportunities list, duration in seconds)
    """
    start_time = datetime.now()
    
    try:
        # Import the scraper module
        scraper_module = importlib.import_module(module_name)
        
        # Check if it has a scrape() function
        if not hasattr(scraper_module, 'scrape'):
            print(f"[Scraper] ⚠ {module_name} has no scrape() function, skipping")
            return [], 0
        
        # Run the scraper
        print(f"\n[Scraper] Starting {module_name}...")
        opportunities = scraper_module.scrape()
        
        # Validate the return type
        if not isinstance(opportunities, list):
            print(f"[Scraper] ✗ {module_name} did not return a list")
            return [], 0
        
        # Calculate duration
        duration = (datetime.now() - start_time).total_seconds()
        
        print(f"[Scraper] ✓ {module_name} completed in {duration:.2f}s")
        print(f"[Scraper]   Returned {len(opportunities)} items")
        
        return opportunities, duration
        
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds()
        print(f"[Scraper] ✗ {module_name} failed after {duration:.2f}s")
        print(f"[Scraper]   Error: {str(e)}")
        print(f"[Scraper]   Traceback:")
        traceback.print_exc()
        return [], duration


def aggregate_opportunities(all_opportunities: List[Dict]) -> List[Dict]:
    """
    Clean, normalize, and deduplicate all opportunities
    
    Args:
        all_opportunities: Combined list from all scrapers
        
    Returns:
        Cleaned and deduplicated list
    """
    print(f"\n[Scraper] Aggregating {len(all_opportunities)} total items...")
    
    # Normalize all opportunities
    normalized = []
    for opp in all_opportunities:
        try:
            norm_opp = normalize_opportunity(opp)
            if validate_opportunity(norm_opp):
                normalized.append(norm_opp)
            else:
                print(f"[Scraper] ⚠ Skipping invalid opportunity: {opp.get('title', 'Unknown')}")
        except Exception as e:
            print(f"[Scraper] ⚠ Error normalizing opportunity: {str(e)}")
            continue
    
    print(f"[Scraper] {len(normalized)} opportunities passed validation")
    
    # Remove duplicates
    unique = remove_duplicates(normalized)
    
    # Sort by date (newest first)
    unique.sort(key=lambda x: x.get('date_posted', ''), reverse=True)
    
    return unique


def get_sources(opportunities: List[Dict]) -> List[str]:
    """
    Extract unique source names from opportunities
    
    Args:
        opportunities: List of opportunities
        
    Returns:
        List of unique source names
    """
    sources = set()
    for opp in opportunities:
        if source := opp.get('source'):
            sources.add(source)
    return sorted(list(sources))


def main():
    """
    Main execution function
    Discovers scrapers, runs them, aggregates results, and writes output
    """
    script_start = datetime.now()
    print("=" * 70)
    print("YouthGuide NA - Opportunity Scraper")
    print("=" * 70)
    print(f"Started at: {script_start.strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Discover all scraper modules
    scrapers = discover_scrapers()
    
    if not scrapers:
        print("[Scraper] ⚠ No scraper modules found!")
        print("[Scraper] Add scraper files to the /scrapers directory")
        sys.exit(1)
    
    print(f"[Scraper] Found {len(scrapers)} scraper(s): {', '.join(scrapers)}\n")
    
    # Run all scrapers
    all_opportunities = []
    scraper_stats = {}
    
    for scraper_name in scrapers:
        opportunities, duration = run_scraper(scraper_name)
        all_opportunities.extend(opportunities)
        scraper_stats[scraper_name] = {
            'count': len(opportunities),
            'duration': duration
        }
    
    # Aggregate and clean
    final_opportunities = aggregate_opportunities(all_opportunities)
    
    # Prepare output data
    output_data = {
        'last_updated': datetime.now().isoformat(),
        'total_count': len(final_opportunities),
        'sources': get_sources(final_opportunities),
        'scraper_stats': scraper_stats,
        'opportunities': final_opportunities
    }
    
    # Write to file
    output_path = os.path.join(
        os.path.dirname(__file__),
        '..',
        'data',
        'opportunities.json'
    )
    output_path = os.path.abspath(output_path)
    
    print(f"\n[Scraper] Writing to {output_path}...")
    success = write_json(output_data, output_path, pretty=True)
    
    # Print summary
    script_end = datetime.now()
    total_duration = (script_end - script_start).total_seconds()
    
    print("\n" + "=" * 70)
    print("SCRAPING SUMMARY")
    print("=" * 70)
    print(f"Total scrapers run: {len(scrapers)}")
    print(f"Total items scraped: {len(all_opportunities)}")
    print(f"Final unique items: {len(final_opportunities)}")
    print(f"Sources: {', '.join(output_data['sources'])}")
    print(f"Total duration: {total_duration:.2f}s")
    print(f"Output file: {output_path}")
    print(f"File written: {'✓ Yes' if success else '✗ Failed'}")
    
    print("\nPer-scraper stats:")
    for scraper_name, stats in scraper_stats.items():
        print(f"  • {scraper_name}: {stats['count']} items in {stats['duration']:.2f}s")
    
    print("\n" + "=" * 70)
    print(f"Completed at: {script_end.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n[Scraper] ⚠ Interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n[Scraper] ✗ Fatal error: {str(e)}")
        traceback.print_exc()
        sys.exit(1)
