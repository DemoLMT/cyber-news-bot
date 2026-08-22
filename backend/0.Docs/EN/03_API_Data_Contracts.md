# CLI & Data Contracts V1

This document specifies the command-line interface (CLI), local configuration files, **SQLite** database schema, and data exchange structures used between components in the Local AI Daily Intelligence Agent V1.

---

## 1. CLI Interface Contract

The system is operated independently via the CLI script `scripts/run_agent.py`.

```bash
python scripts/run_agent.py [OPTIONS]
```

### CLI Options:

| Parameter | Data Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `--dry-run` | Flag | `False` | Dry-run mode for data collection and processing. Invokes the LLM but bypasses database storage and Telegram notification dispatch. |
| `--mode` | String | `require_review` | Selects execution mode. Available options: `accept_all` or `require_review`. |
| `--section` | String | `all` | Specifies a specific topic section to run (e.g., `hot_news`, `market_gold`, `stock_watchlist`, `ai_research`, `github_repos`). Default is `all`. |
| `--date` | String (YYYY-MM-DD) | Current Date | Re-runs the digest generation process for a specific past date. |
| `--no-cache` | Flag | `False` | Forces fresh data collection, bypassing cache or temporary duplication checks. |

---

## 2. Local Configuration Files (Configuration Contracts)

### 2.1. Application Configuration File (`config/app.yaml`)

```yaml
timezone: "Asia/Bangkok"
mode: "require_review" # require_review | accept_all

llm:
  provider: "ollama"
  base_url: "http://localhost:11434"
  model: "qwen2.5:7b-instruct"
  timeout_seconds: 180
  temperature: 0.1

notification:
  provider: "telegram"
  telegram_bot_token: "ENV_TELEGRAM_BOT_TOKEN" # Read from env variables
  telegram_chat_id: "ENV_TELEGRAM_CHAT_ID"     # Read from env variables
  max_bullets: 10

storage:
  base_dir: "storage"
  db_dir: "storage/database"
  raw_dir: "storage/digests/raw"
  reports_dir: "storage/digests/reports"
  log_dir: "storage/logs"
  retention_days: 7
```

### 2.2. Source Configuration File (`config/sources.yaml`)

```yaml
sources:
  - id: "vietnam_news_rss_1"
    name: "VnExpress Tin Nóng"
    type: "rss"
    topic: "hot_news"
    url: "https://vnexpress.net/rss/tin-noi-bat.rss"
    reliability: 4
    enabled: true

  - id: "gold_sjc_price"
    name: "Giá vàng SJC công cộng"
    type: "browser" # Uses Browser Automation (Playwright)
    topic: "market_gold"
    url: "https://giavang.doji.vn/"
    reliability: 5
    enabled: true
    selectors:
      gold_buy: ".price-buy"
      gold_sell: ".price-sell"

  - id: "arxiv_ai_papers"
    name: "arXiv Artificial Intelligence"
    type: "api"
    topic: "ai_research"
    url: "https://export.arxiv.org/api/query"
    reliability: 5
    enabled: true
    params:
      search_query: "cat:cs.AI OR cat:cs.LG"
      max_results: 15
```

---

## 3. SQLite Database Schema (`storage/database/history.db`)

Data is stored in a local SQLite file. The table structures are:

### Table 3.1. `runs` (Execution History)
Stores general metadata for each script execution.

| Field Name | SQLite Data Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique execution session ID (UUIDv4) |
| `target_date` | TEXT | NOT NULL | Target date for the digest (formatted `YYYY-MM-DD`) |
| `mode` | TEXT | NOT NULL | Execution mode: `accept_all` or `require_review` |
| `status` | TEXT | NOT NULL | Status: `running`, `success`, `failed` |
| `started_at` | TEXT | NOT NULL | Execution start time (ISO 8601) |
| `finished_at` | TEXT | | Execution completion time (ISO 8601) |
| `tokens_used` | INTEGER | | LLM tokens consumed |
| `error_log` | TEXT | | Error message if the run fails |

### Table 3.2. `dedupe_registry` (Deduplication Registry)
Stores hashes of article contents to perform deduplication within the last 7 days.

| Field Name | SQLite Data Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `content_hash` | TEXT | PRIMARY KEY | Unique hash of the article (SHA256 of Title + URL) |
| `source_id` | TEXT | NOT NULL | Source identifier from the YAML file |
| `topic` | TEXT | NOT NULL | News topic category |
| `first_seen_at` | TEXT | NOT NULL | Timestamp of first detection (ISO 8601) |

### Table 3.3. `browser_audit_logs` (Browser Action Logs)
Stores the audit trail of computer control (Computer Use) actions executed by Playwright for post-auditing.

| Field Name | SQLite Data Type | Attributes | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Auto-incrementing ID |
| `run_id` | TEXT | NOT NULL | Foreign key referencing the `runs` table |
| `action_time` | TEXT | NOT NULL | Timestamp when the action occurred (ISO 8601) |
| `action_type` | TEXT | NOT NULL | Action type: `click`, `input`, `navigate`, `login` |
| `target_selector` | TEXT | | Target element/selector on the webpage |
| `screenshot_path` | TEXT | | Local path to the saved audit screenshot |
| `user_approval` | TEXT | | Action approval status: `approved`, `rejected`, `injected` |
| `injected_text` | TEXT | | User intervention text if provided |

---

## 4. Agent State Schema

The state object (`AgentState`) passed between nodes in the State Graph is defined as a TypedDict:

```python
from typing import TypedDict, List, Dict, Any

class AgentState(TypedDict):
    run_id: str                          # UUIDv4 of the current execution session
    target_date: str                     # Target date formatted as YYYY-MM-DD
    mode: str                            # Execution mode: accept_all | require_review
    stage: str                           # Name of the active node
    
    raw_items: List[Dict[str, Any]]      # Raw data collected from the tools/scrapers
    unique_items: List[Dict[str, Any]]   # Unique data filtered via SQLite deduplication
    candidates: Dict[str, List[Dict[str, Any]]] # High-quality candidates grouped by topic section
    
    section_outputs: Dict[str, Any]     # JSON output generated by the LLM for each section
    digest_markdown: str                 # Final compiled Markdown newsletter string
    
    warnings: List[str]                  # Warnings that do not halt execution (e.g., individual source errors)
    errors: List[Dict[str, Any]]         # Details of system errors encountered
```

---

## 5. Output Formats

### 5.1. JSON Digest Format (`storage/digests/reports/digest_{date}.json`)

```json
{
  "run_id": "8f3a992d-4567-4a8e-a4b7-d1a2f3b4c5d6",
  "date": "2026-05-31",
  "timezone": "Asia/Bangkok",
  "status": "success",
  "executive_summary": [
    "VN-Index tiếp tục giằng co quanh vùng 1.250 điểm với thanh khoản thấp.",
    "Giá vàng SJC trong nước giữ nguyên ở mức 89 triệu đồng/lượng.",
    "Mô hình Qwen 2.5 phát hành phiên bản chuyên biệt cho tác vụ xử lý Agent cục bộ."
  ],
  "sections": {
    "market_gold": [
      {
        "event": "Giá vàng SJC biến động nhẹ",
        "market_angle": "Duy trì chênh lệch cao so với giá vàng thế giới khoảng 12 triệu đồng.",
        "affected_assets": ["SJC", "PNJ"],
        "citations": [
          {
            "title": "Bảng giá vàng DOJI ngày 31/05",
            "url": "https://giavang.doji.vn/"
          }
        ]
      }
    ]
  }
}
```

### 5.2. Markdown Detailed Report Format (`storage/digests/reports/digest_{date}.md`)

```markdown
# Daily Intelligence Digest - 05/31/2026
*Run ID: 8f3a992d-4567-4a8e-a4b7-d1a2f3b4c5d6*

---

## 📌 Executive Summary
- VN-Index tiếp tục giằng co quanh vùng 1.250 điểm với thanh khoản thấp.
- Giá vàng SJC trong nước giữ nguyên ở mức 89 triệu đồng/lượng.
- Mô hình Qwen 2.5 phát hành phiên bản chuyên biệt cho tác vụ xử lý Agent cục bộ.

---

## 📈 Market & Gold
### Giá vàng SJC biến động nhẹ
*   **Market Perspective:** Duy trì mức chênh lệch cao so với thế giới ở ngưỡng 12 triệu đồng/lượng.
*   **Affected Assets:** `SJC`, `PNJ`
*   **Sources:** [Bảng giá vàng DOJI ngày 31/05](https://giavang.doji.vn/)

---
*Warning: The above information is for personal research purposes only, and does not constitute financial investment advice or trading recommendations.*
```
