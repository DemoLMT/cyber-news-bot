import json
import os
from pathlib import Path

try:
    import httpx
except ImportError:
    httpx = None


def _http_post_json(url: str, data: dict, timeout: int = 30):
    if httpx is not None:
        with httpx.Client(timeout=timeout) as client:
            return client.post(url, json=data)
    import urllib.request
    import urllib.error
    import urllib.parse
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            class Response:
                status_code = resp.getcode()
                text = resp.read().decode('utf-8')
            return Response()
    except urllib.error.HTTPError as exc:
        class Response:
            status_code = exc.code
            text = exc.read().decode('utf-8', errors='ignore')
        return Response()


def _build_api_url(bot_token: str, method: str) -> str:
    return f"https://api.telegram.org/bot{bot_token}/{method}"


def send_telegram_message(bot_token: str, chat_id: str, text: str, parse_mode: str = 'HTML') -> bool:
    if not bot_token or not chat_id:
        return False
    url = _build_api_url(bot_token, 'sendMessage')
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': parse_mode,
        'disable_web_page_preview': True,
    }
    response = _http_post_json(url, payload)
    return getattr(response, 'status_code', 0) == 200


def send_telegram_document(bot_token: str, chat_id: str, file_path: str, caption: str | None = None) -> bool:
    if not bot_token or not chat_id:
        return False
    file_path_obj = Path(file_path)
    if not file_path_obj.exists():
        return False
    if httpx is not None:
        with httpx.Client() as client:
            url = _build_api_url(bot_token, 'sendDocument')
            with file_path_obj.open('rb') as fp:
                files = {'document': (file_path_obj.name, fp)}
                data = {'chat_id': chat_id}
                if caption:
                    data['caption'] = caption
                    data['parse_mode'] = 'HTML'
                resp = client.post(url, data=data, files=files)
                return resp.status_code == 200
    try:
        import requests
    except ImportError:
        return False
    with file_path_obj.open('rb') as fp:
        url = _build_api_url(bot_token, 'sendDocument')
        files = {'document': (file_path_obj.name, fp)}
        data = {'chat_id': chat_id}
        if caption:
            data['caption'] = caption
            data['parse_mode'] = 'HTML'
        resp = requests.post(url, data=data, files=files, timeout=60)
        return resp.status_code == 200
