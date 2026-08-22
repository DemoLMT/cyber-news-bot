import os
import feedparser
import urllib.parse
import urllib.request
import urllib.error
import json
from typing import Any


def collect_rss(source: dict) -> dict:
    url = source.get('url')
    if not url:
        raise ValueError('RSS source must have url')
    request = urllib.request.Request(url, headers={'User-Agent': 'CyberCTIAgent/1.0'})
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            feed = feedparser.parse(response.read())
    except (urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError(f'RSS unavailable: {exc}') from exc
    items = []
    for entry in feed.entries[:15]:
        items.append({
            'source_id': source.get('id'),
            'topic': source.get('topic'),
            'type': 'rss',
            'title': entry.get('title'),
            'url': entry.get('link'),
            'summary': entry.get('summary') or entry.get('description'),
            'published': entry.get('published'),
            'raw': entry,
        })
    return {'source_id': source.get('id'), 'topic': source.get('topic'), 'type': 'rss', 'items': items}


def collect_api(source: dict) -> dict:
    url = source.get('url')
    params = source.get('params', {}) or {}
    if not url:
        raise ValueError('API source must have url')
    if 'search_query' in params:
        query_string = urllib.parse.urlencode({'search_query': params['search_query'], 'max_results': params.get('max_results', 10)})
        full_url = f"{url}?{query_string}"
    else:
        full_url = url
    try:
        with urllib.request.urlopen(full_url, timeout=30) as resp:
            raw_text = resp.read().decode('utf-8', errors='ignore')
    except urllib.error.HTTPError as exc:
        raw_text = exc.read().decode('utf-8', errors='ignore')
    feed = feedparser.parse(raw_text)
    items = []
    for entry in feed.entries[: params.get('max_results', 10)]:
        items.append({
            'source_id': source.get('id'),
            'topic': source.get('topic'),
            'type': 'api',
            'title': entry.get('title'),
            'url': entry.get('link'),
            'summary': entry.get('summary') or entry.get('description'),
            'published': entry.get('published'),
            'raw': entry,
        })
    return {'source_id': source.get('id'), 'topic': source.get('topic'), 'type': 'api', 'items': items}
