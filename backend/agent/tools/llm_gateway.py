import json
import os
from pathlib import Path

try:
    import httpx
except ImportError:
    httpx = None


def load_config(config: dict) -> dict:
    llm = config.get('llm', {})
    host = os.environ.get('OLLAMA_HOST', llm.get('base_url', 'http://localhost:11434'))
    return {
        'base_url': host.rstrip('/'),
        'model': llm.get('model', 'qwen2.5:7b-instruct'),
        'temperature': float(llm.get('temperature', 0.1)),
        'timeout': int(llm.get('timeout_seconds', 180)),
    }


def _http_post_json(url: str, payload: dict, timeout: int = 30):
    if httpx is not None:
        with httpx.Client(timeout=timeout) as client:
            return client.post(url, json=payload)
    import urllib.request
    import urllib.error
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
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


def generate_digest_prompt(section_items: list[dict], topic: str, target_date: str) -> str:
    intro = f"Bạn là chuyên gia CTI. Tóm tắt tin an ninh mạng ngày {target_date}."
    bullets = []
    for item in section_items:
        title = item.get('title') or item.get('name') or ''
        source = item.get('source') or item.get('url') or ''
        snippet = item.get('summary') or item.get('description') or item.get('content') or ''
        bullets.append(f"- {title}\n  Nguồn: {source}\n  Tóm tắt: {snippet}")
    body = '\n'.join(bullets)
    prompt = (
        f"{intro}\n\n" 
        f"Chủ đề: {topic}\n" 
        f"Dữ liệu đầu vào:\n{body}\n\n" 
        "Trả JSON ngắn: executive_summary (tối đa 3 câu), sections (title, summary, citations), "
        "warnings. Không suy diễn ngoài dữ liệu. Tiếng Việt."
    )
    return prompt


def call_ollama(prompt: str, config: dict) -> dict:
    if not config:
        raise ValueError('LLM config is required')
    base_url = config['base_url']
    model = config['model']
    timeout = config['timeout']
    request_url = f"{base_url}/v1/chat/completions"
    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': 'Bạn là một trợ lý AI thông minh.'},
            {'role': 'user', 'content': prompt},
        ],
        'temperature': config['temperature'],
        'max_tokens': 500,
    }
    response = _http_post_json(request_url, payload, timeout=timeout)
    if getattr(response, 'status_code', 0) != 200:
        raise RuntimeError(f'Ollama request failed: {getattr(response, "status_code", None)} {getattr(response, "text", "")}')
    data = json.loads(response.text)
    choices = data.get('choices') or []
    if not choices:
        raise RuntimeError('Ollama returned no choices')
    message = choices[0].get('message', {})
    content = message.get('content') or message.get('content', '')
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Try extracting JSON from text
        start = content.find('{')
        end = content.rfind('}')
        if start == -1 or end == -1:
            raise
        return json.loads(content[start:end+1])
