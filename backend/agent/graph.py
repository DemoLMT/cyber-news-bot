import os
import yaml
import uuid
import json
import hashlib
import re
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    from langgraph import StateGraph, Node
except ImportError:
    class Node:
        pass

    class StateGraph:
        def __init__(self, *args, **kwargs):
            pass

        def add_node(self, *args, **kwargs):
            pass

        def add_edge(self, *args, **kwargs):
            pass

        def add_error_handler(self, *args, **kwargs):
            pass
from agent.state import AgentState
from agent.tools.db_manager import initialize_database, get_database_path, add_run, register_item_hash, is_duplicate, cleanup_old_dedupes
from agent.tools.api_collector import collect_rss, collect_api
from agent.tools.browser_collector import collect_browser_data
from agent.tools.llm_gateway import load_config, generate_digest_prompt, call_ollama
from agent.tools.telegram_sender import send_telegram_message, send_telegram_document


class LoadConfigNode(Node):
    def run(self, state: AgentState) -> AgentState:
        config_path = Path(__file__).resolve().parent.parent / 'config' / 'app.yaml'
        sources_path = Path(__file__).resolve().parent.parent / 'config' / 'sources.yaml'
        with config_path.open('r', encoding='utf-8') as fp:
            state.config = yaml.safe_load(fp)
        with sources_path.open('r', encoding='utf-8') as fp:
            state.sources = yaml.safe_load(fp).get('sources', [])
        state.llm_config = load_config(state.config)
        state.database_path = get_database_path(state.config)
        state.database_conn = initialize_database(state.database_path)
        state.run_id = str(uuid.uuid4())
        state.started_at = datetime.now().isoformat()
        state.stage = 'load_config'
        return state


class CollectNode(Node):
    def run(self, state: AgentState) -> AgentState:
        items = []

        allowed_topics = {
            "cybersecurity_vn",
            "cybersecurity_global",
            "gov_security"
        }

        for source in state.sources:
            if not source.get('enabled', True):
                continue

            if source.get("topic") not in allowed_topics:
                continue

            try:
                if source.get('type') == 'rss':
                    result = collect_rss(source)
                    items.extend(result.get('items', []))

                elif source.get('type') == 'api':
                    result = collect_api(source)
                    items.extend(result.get('items', []))

                elif source.get('type') == 'browser':
                    result = collect_browser_data(source, state.mode)
                    items.append(result)

            except Exception as exc:
                state.add_warning(f"Collect failed {source.get('id')}: {exc}")

        state.raw_items = items
        state.stage = 'collect'
        return state

class NormalizeNode(Node):
    def run(self, state: AgentState) -> AgentState:
        normalized = []
        for item in state.raw_items:
            title = item.get('title') or item.get('name') or 'No title'
            summary = item.get('summary') or item.get('content') or ''
            text = f'{title} {summary}'
            cves = re.findall(r'\bCVE-\d{4}-\d{4,7}\b', text, re.I)
            iocs = cves + re.findall(r'\b(?:https?://|[\w.-]+\.(?:com|net|org|vn|ru)\b)', text, re.I)[:5]
            lowered = text.lower()
            threat_type = ('Vulnerability' if cves else
                           'Ransomware' if 'ransomware' in lowered else
                           'Phishing' if 'phishing' in lowered else
                           'Data Breach' if any(word in lowered for word in ('breach', 'leak', 'rò rỉ', 'lộ dữ liệu')) else
                           'Cybersecurity')
            normalized.append({
                'source_id': item.get('source_id'),
                'topic': item.get('topic'),
                'title': title,
                'url': item.get('url'),
                'summary': summary[:1000],
                'content': item.get('content') or summary,
                'published': item.get('published'),
                'type': item.get('type'),
                'raw': item.get('raw'),
                'cves': list(dict.fromkeys(cves)),
                'iocs': list(dict.fromkeys(iocs)),
                'threat_type': threat_type,
            })
        state.unique_items = normalized
        state.stage = 'normalize'
        return state


class DeduplicateNode(Node):
    def run(self, state: AgentState) -> AgentState:
        unique = []
        for item in state.unique_items:
            raw_key = f"{item.get('title','')}|{item.get('url','')}"
            hashed = hashlib.sha256(raw_key.strip().lower().encode('utf-8')).hexdigest()
            if is_duplicate(state.database_conn, hashed):
                continue
            register_item_hash(state.database_conn, hashed, item.get('source_id', ''), item.get('topic', ''), datetime.now().isoformat())
            unique.append(item)
        state.unique_items = unique
        cleanup_old_dedupes(state.database_conn, state.config.get('storage', {}).get('retention_days', 7))
        state.stage = 'deduplicate'
        return state


class RankClusterNode(Node):
    def run(self, state: AgentState) -> AgentState:
        candidates: dict[str, list[dict[str, Any]]] = {}
        for item in state.unique_items:
            topic = item.get('topic') or 'misc'
            candidates.setdefault(topic, []).append(item)
        for topic, items in candidates.items():
            for item in items:
                text = f"{item.get('title', '')} {item.get('summary', '')}".lower()
                score = 25 + min(len(item.get('cves', [])) * 20, 30)
                score += 25 if any(word in text for word in ('exploit', 'actively exploited', 'ransomware')) else 0
                score += 10 if item.get('iocs') else 0
                item['risk_score'] = min(score, 100)
                item['severity'] = 'critical' if score >= 80 else 'high' if score >= 60 else 'medium' if score >= 40 else 'low'
                item['recommendation'] = 'Ưu tiên kiểm tra và vá ngay.' if item['severity'] in ('critical', 'high') else 'Theo dõi, xác minh và cập nhật biện pháp phòng vệ.'
            candidates[topic] = sorted(items, key=lambda x: x.get('published') or '', reverse=True)[:5]
        state.candidates = candidates
        state.stage = 'rank_cluster'
        return state


class SummarizeNode(Node):
    def run(self, state: AgentState) -> AgentState:
        section_outputs = {}
        for topic, items in state.candidates.items():
            prompt = generate_digest_prompt(items, topic, state.target_date)
            try:
                section_outputs[topic] = call_ollama(prompt, state.llm_config)
            except Exception as exc:
                state.add_warning(f'LLM summarize failed for topic {topic}: {exc}')
                section_outputs[topic] = {
                    'executive_summary': [item.get('title', '') for item in items[:3]],
                    'sections': [{'title': item.get('title'), 'summary': item.get('summary', ''), 'citations': [{'url': item.get('url'), 'title': item.get('title')}]} for item in items[:5]],
                }
        state.section_outputs = section_outputs
        state.stage = 'summarize'
        return state


class NotifyNode(Node):
    def run(self, state: AgentState) -> AgentState:
        report_dir = Path(state.config.get('storage', {}).get('reports_dir', 'storage/digests/reports'))
        report_dir.mkdir(parents=True, exist_ok=True)
        markdown_lines = [f"# Bản Tin Trí Tuệ Hàng Ngày - {state.target_date}", f"*Mã phiên chạy: {state.run_id}*", '', '---', '']
        summary_lines = ['## 📌 Tóm Tắt Nhanh (Executive Summary)', '']
        for topic, data in state.section_outputs.items():
            summary = data.get('executive_summary', [])
            if summary:
                summary_lines.append(f'### {topic}')
                summary_lines.extend(f'- {line}' for line in summary)
                summary_lines.append('')
        markdown_lines.extend(summary_lines)
        markdown_lines.append('---')
        markdown_lines.append('')
        for topic, data in state.section_outputs.items():
            markdown_lines.append(f'## {topic}')
            for section in data.get('sections', []):
                markdown_lines.append(f"### {section.get('title', 'Không có tiêu đề')}")
                markdown_lines.append(section.get('summary', ''))
                markdown_lines.append('')
                if citations := section.get('citations'):
                    markdown_lines.append('*Nguồn dẫn:*')
                    for cit in citations:
                        markdown_lines.append(f"- [{cit.get('title', cit.get('url'))}]({cit.get('url')})")
                    markdown_lines.append('')
            markdown_lines.append('---')
            markdown_lines.append('')
        report_path = report_dir / f"digest_{state.target_date}.md"
        report_path.write_text('\n'.join(markdown_lines), encoding='utf-8')
        state.digest_markdown = report_path.read_text(encoding='utf-8')
        if state.config.get('notification', {}).get('provider') == 'telegram':
            bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
            chat_id = os.environ.get('TELEGRAM_CHAT_ID')
            executive_summary = []
            for topic, data in state.section_outputs.items():
                executive_summary.extend(data.get('executive_summary', []))
            message = '<b>Bản tin AI ngày {}</b>\n'.format(state.target_date)
            message += '\n'.join(f'• {item}' for item in executive_summary[: state.config.get('notification', {}).get('max_bullets', 10)])
            if bot_token and chat_id:
                send_telegram_message(bot_token, chat_id, message)
                send_telegram_document(bot_token, chat_id, str(report_path), caption=f'Bản tin chi tiết {state.target_date}')
        if not state.section_outputs:
            message = "⚠️ Không có dữ liệu an ninh mạng hôm nay"
            bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
            chat_id = os.environ.get('TELEGRAM_CHAT_ID')
            if bot_token and chat_id:
                send_telegram_message(bot_token, chat_id, message)
            return state
        state.stage = 'notify'
        return state


class FinalizeNode(Node):
    def run(self, state: AgentState) -> AgentState:
        state.finished_at = datetime.now().isoformat()
        state.stage = 'finalize'
        add_run(state.database_conn, {
            'id': state.run_id,
            'target_date': state.target_date,
            'mode': state.mode,
            'status': 'success',
            'started_at': state.started_at,
            'finished_at': state.finished_at,
            'tokens_used': None,
            'error_log': None,
        })
        return state


class ErrorNode(Node):
    def run(self, state: AgentState) -> AgentState:
        state.finished_at = datetime.now().isoformat()
        state.stage = 'error'
        add_run(state.database_conn, {
            'id': state.run_id,
            'target_date': state.target_date,
            'mode': state.mode,
            'status': 'failed',
            'started_at': state.started_at,
            'finished_at': state.finished_at,
            'tokens_used': None,
            'error_log': json.dumps(state.errors, ensure_ascii=False),
        })
        return state


class DailyAgentGraph(StateGraph):
    def __init__(self):
        super().__init__(start_node=LoadConfigNode())
        self.add_node(CollectNode())
        self.add_node(NormalizeNode())
        self.add_node(DeduplicateNode())
        self.add_node(RankClusterNode())
        self.add_node(SummarizeNode())
        self.add_node(NotifyNode())
        self.add_node(FinalizeNode())
        self.add_node(ErrorNode())

    def build(self, state: AgentState):
        self.add_edge(LoadConfigNode, CollectNode)
        self.add_edge(CollectNode, NormalizeNode)
        self.add_edge(NormalizeNode, DeduplicateNode)
        self.add_edge(DeduplicateNode, RankClusterNode)
        self.add_edge(RankClusterNode, SummarizeNode)
        self.add_edge(SummarizeNode, NotifyNode)
        self.add_edge(NotifyNode, FinalizeNode)
        self.add_error_handler(Exception, ErrorNode)
        return self
