# Local AI Daily Intelligence Agent

<p align="center">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white" alt="LangGraph" />
  <img src="https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white" alt="Ollama" />
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" />
</p>

<p align="center">
  <b>English Edition</b> | <a href="README.md">Bản Tiếng Việt</a>
</p>

A local-first, private AI Agent system that utilizes local Large Language Models (LLMs) to automatically collect news, financial market data, AI research, and trending GitHub repositories, delivering a daily digest directly to your smartphone via Telegram.

---

## 🌟 Key Highlights

1. **Local-first & Secure:** All data is processed, stored, and analyzed locally on your machine. No third-party cloud services are used except for the Telegram notification channel.
2. **Stateful Workflow (State Graph):** The execution flow is strictly managed using `LangGraph`, dividing the pipeline into modular Nodes (Collect $\rightarrow$ Normalize $\rightarrow$ Deduplicate $\rightarrow$ Cluster/Rank $\rightarrow$ LLM Synthesis $\rightarrow$ Verify $\rightarrow$ Notify).
3. **Intelligent Data Collection:**
   - Automatically polls news via public RSS feeds and public APIs.
   - Utilizes **Browser Automation (Playwright)** to log into research or secondary accounts to scrape financial data (gold prices, stock market updates) without relying on paid APIs.
4. **Human-in-the-loop & Adaptive Context:**
   - The `require_review` mode pauses execution before critical browser actions, displaying a real-time screenshot for you to approve or reject.
   - Supports injecting corrective context (`Inject Context`) from the Terminal to resolve unexpected errors (incorrect password, captcha, UI changes) without disrupting the Agent's execution loop.
5. **Lightweight Embedded Database:** Uses SQLite to store run executions (`runs`) and article checksums (`dedupe_registry`) to ensure news is not repeated within a 7-day window.
6. **Polished Reports:** The final digest is rendered in detailed Markdown format with clear citations, accompanied by a brief summary sent via Telegram.

---

## 🛠️ Technologies Used

*   **Core Logic:** Python 3.10+, `LangGraph` (Agent state graph)
*   **Local LLM Gateway:** `Ollama` (local interface on port `11434`)
*   **Database:** SQLite with `SQLAlchemy` ORM for storage and deduplication.
*   **Browser Automation:** `Playwright` for headless/headed scraping.
*   **Network Client:** `httpx` for asynchronous requests and `feedparser` for RSS feeds.
*   **Template Rendering:** `Jinja2` and `markdown` libraries to export HTML/Markdown reports.
*   **Notification:** Telegram Bot API.

---

## 📁 Directory Structure

```text
AI_agent_computer_use/
├── 0.Docs/                   # Detailed project specification and planning documents (Master Plan, Architecture...)
├── agent/                    # Core AI Agent source code
│   ├── models/               # Pydantic schemas for data validation (item, digest)
│   ├── nodes/                # Execution logic for each node in LangGraph (collect, deduplicate, notify...)
│   ├── tools/                # Execution modules (Playwright, DB manager, LLM, Telegram...)
│   ├── graph.py              # Stateful workflow graph definition
│   └── state.py              # Shared agent state definition (AgentState)
├── config/                   # YAML configuration files
│   ├── app.yaml              # General configurations for the Agent
│   └── sources.yaml          # List of data source configurations
├── database/                 # SQLite database setup
│   ├── connection.py         # SQLAlchemy engine initialization
│   └── schema.py             # SQLite database schemas (runs, dedupe_registry)
├── scripts/                  # Scripts for initialization and running
│   ├── run_agent.py          # Entrypoint to run the CLI Agent
│   └── setup_env.sh          # Setup script for Python virtual environment (venv)
├── storage/                  # Generated files and output directory (Auto-created)
│   ├── database/             # SQLite database file (history.db)
│   ├── digests/              # Daily generated Markdown reports and raw JSON data
│   └── logs/                 # Active execution logs and screenshot audit logs
├── .env.example              # Sample environment variables configuration file
├── requirements.txt          # Python library dependencies
└── README.md                 # Vietnamese README file
```

---

## 🚀 Getting Started with Local Ollama

This project relies on a local Large Language Model served via **Ollama** for summarizing and analyzing news. Follow the steps below to set it up:

### Step 1: Install Ollama
Download and install the version matching your operating system from the official website: [Ollama.com](https://ollama.com).
*   **Linux/macOS:** Run the quick installation command:
    ```bash
    curl -fsSL https://ollama.com/install.sh | sh
    ```

### Step 2: Download the Language Model (LLM)
We recommend using `qwen2.5:7b-instruct` (excellent Vietnamese support and stable JSON output) or `llama3:8b-instruct`.
Open your terminal and run:
```bash
# Pull Qwen 2.5
ollama pull qwen2.5:7b-instruct

# Or pull Llama 3
ollama pull llama3:8b-instruct
```

### Step 3: Run the Ollama Service
Usually, Ollama starts automatically in the background after installation. You can check its status or run it manually using:
```bash
ollama serve
```
*   *Note:* The default port for Ollama is `http://localhost:11434`. The Agent will automatically connect to it. You can verify it is running by visiting the URL in your browser; it should display `Ollama is running`.
