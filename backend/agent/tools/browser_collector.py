import os
import time
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None


def load_source_params(source: dict) -> dict:
    return source.get('params', {}) or {}


def collect_browser_data(source: dict, mode: str = 'require_review') -> dict:
    if sync_playwright is None:
        raise RuntimeError('playwright is not installed')
    url = source.get('url')
    if not url:
        raise ValueError('Browser source must have url')
    selectors = load_source_params(source).get('selectors', {})
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=os.environ.get('PLAYWRIGHT_HEADLESS', 'true').lower() != 'false')
        context = browser.new_context()
        page = context.new_page()
        page.goto(url, wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(2000)
        if mode == 'require_review':
            screenshot_dir = Path(source.get('screenshots_dir', 'storage/logs'))
            screenshot_dir.mkdir(parents=True, exist_ok=True)
            screenshot_path = screenshot_dir / f"browser_review_{int(time.time())}.png"
            page.screenshot(path=str(screenshot_path), full_page=True)
        result = {
            'source_id': source.get('id'),
            'topic': source.get('topic'),
            'type': 'browser',
            'title': source.get('name'),
            'url': url,
            'content': '',
            'raw': {},
        }
        raw_data = {}
        for key, selector in selectors.items():
            try:
                element = page.query_selector(selector)
                raw_data[key] = element.inner_text().strip() if element else None
            except Exception:
                raw_data[key] = None
        result['raw'] = raw_data
        result['content'] = ' | '.join(f'{k}: {v}' for k, v in raw_data.items() if v)
        browser.close()
        return result
