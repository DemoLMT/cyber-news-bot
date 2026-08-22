# Technology Stack Mapping V1

This document specifies the technologies, libraries, and implementation mechanisms selected to resolve the logical challenges defined in [01_System_Architecture.md](01_System_Architecture.md) for version V1.

---

## 1. Component Technology Mapping

| Logical Component (in Architecture) | Selected Technology / Library | Role and Selection Rationale in V1 |
| :--- | :--- | :--- |
| **Workflow Controller** | Python CLI script (`scripts/run_agent.py`) | Launches standalone, handles command-line arguments via the `argparse` library, and loads environment variables from `.env` using `python-dotenv`. |
| **State Graph & Memory** | `LangGraph` (or customized State-machine) | Manages the sequential execution lifecycle of Nodes, passing state variables between steps as a Python `TypedDict`. |
| **Embedded Database** | **SQLite** (`sqlite3` / `SQLAlchemy`) | Physical file storage at `storage/database/history.db`. Lightweight, built into Python, requiring no background service installations. Manages the `runs` and `dedupe_registry` tables. |
| **Browser Automation Engine** | **Playwright for Python** (`playwright`) | Browser automation (headed/headless). Uses persistent Browser Context storage to reuse existing login cookies, minimizing direct password entries. |
| **Local LLM Gateway** | **Ollama** (`http://localhost:11434`) | Runs local large language models (e.g., `qwen2.5:7b-instruct` or `llama3:8b-instruct`). Supports JSON Mode to enforce structured output configurations for each section. |
| **Notification Sender** | **Telegram Bot API** (`httpx`) | Sends Markdown-formatted messages and calls the Telegram API to directly attach and upload detailed `.md` files to the user's phone, avoiding complex cloud synchronization. |
| **OS Scheduler** | **Cron Job** (Linux/macOS `crontab`) | Schedules the daily execution of the system (e.g., `0 18 * * * /usr/bin/python3 /path/to/run_agent.py`). |

---

## 2. Technical Solutions for Each AI Pipeline Stage

### Stage 1: Collect via Browser Automation & APIs
*   **RSS / Public APIs:** Use `httpx` (or `requests`) running asynchronously (`asyncio`) to download multiple public news sources concurrently (arXiv, GitHub Search API) with `timeout=10` and retry error handling.
*   **Computer Use (Playwright):** 
    *   Use the `playwright.async_api` library.
    *   To handle **Human-in-the-loop (require_review)**: In this mode, the Playwright execution pauses using `await asyncio.get_event_loop().run_in_executor(None, input, "Press A to Approve, R to Reject, I to Intervene: ")`. Meanwhile, the current screen is saved to `storage/logs/last_screenshot.png` for quick user inspection.
    *   To handle **Adaptive Context**: If the user selects `I`, the typed string is forwarded to the Action Generator LLM to produce new click actions or input steps based on the corrective feedback.

### Stage 2: Normalize & Deduplicate via SQLite
*   **Data Normalization:** Use Pydantic models to cast raw data into a shared schema (`Title`, `URL`, `Source`, `Published_At`, `Raw_Text`).
*   **Deduplication:**
    *   Create the `dedupe_registry` table in SQLite with a unique index on the `content_hash` field (MD5/SHA256 of the article title or content).
    *   For each new article, query for the existence of its hash. If it exists in the last 7 days of history, discard it to avoid reporting duplicate articles.

### Stage 3: Rank & Cluster via Python
*   **Simple Clustering:** Group articles with high title similarity using basic string-matching algorithms (e.g., `difflib.SequenceMatcher` or fuzzy string matching via `rapidfuzz`), bypassing heavy embedding models to reduce local computation times.
*   **Rule-based Scoring (Ranking):** Implement a scoring module calculating hotness using weighted metrics for publication recency and source authority.

### Stage 4: Summarize via Ollama JSON Mode
*   **Context Window Control (Token Budgeting):** Limit the article candidates fed into the prompt (e.g., retrieving only the top 5 highest-scored items for each digest section).
*   **JSON Enforcing:** Set the `"format": "json"` parameter in the Ollama API call payload to guarantee that the returned response is a valid JSON structure conforming to the preconfigured Pydantic schema.

### Stage 5: Notify via Telegram API
*   **API Invocation:** Call `POST https://api.telegram.org/bot<TOKEN>/sendDocument` to upload the `.md` file from `storage/digests/` and attach the 5-10 line summary as a caption.
