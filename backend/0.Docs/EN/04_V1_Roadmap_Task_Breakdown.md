# Implementation Roadmap & Task Breakdown V1 - 7 Days

## 1. V1 Goals after 7 Days

At the end of Day 7, the system must execute stably end-to-end from a single command-line trigger:
1.  Collect real-world data from configured sources (public RSS/APIs & automated Playwright browser logging into secondary accounts).
2.  Perform data normalization, check against the SQLite registry to filter duplicates, and rank article hotness.
3.  Invoke the Local LLM (Ollama) to synthesize the 5 main sections into a stable JSON format.
4.  Apply the Human-in-the-loop review and Adaptive Context injection directly from the console during Playwright sessions.
5.  Publish local Markdown reports and send direct alerts to the user's smartphone via Telegram Bot with physical file attachments.
6.  Provide detailed operations and debugging documentation.

---

## 2. 7-Day Execution Plan

### Day 1: Platform Setup and SQLite Database Initialization
*   **Deliverables:**
    *   Standard project directory structure.
    *   Sample configuration files (`.env.example`, `config/app.yaml`, `config/sources.yaml`).
    *   Initialize the local SQLite database (`storage/database/history.db`) and core tables.
*   **Tasks:**
    *   Create project directory tree: `agent/`, `config/`, `scripts/`, `storage/database/`, `storage/digests/raw/`, `storage/digests/reports/`, `storage/logs/`.
    *   Develop the config loader module using `PyYAML` and `python-dotenv`.
    *   Set up SQLAlchemy and initialize the local SQLite DB file. Create tables: `runs`, `dedupe_registry`, `browser_audit_logs`.
*   **Definition of Done (DoD):**
    *   The database connection test script runs successfully, auto-generating the `.db` file and empty tables.
    *   Config values are successfully read and printed from YAML/ENV variables.

### Day 2: Agent Orchestration Framework (State Graph Core) & Telegram Adapter
*   **Deliverables:**
    *   Basic State Graph flow executing through dummy placeholder nodes.
    *   Telegram Bot integration capable of sending test messages and physical files.
*   **Tasks:**
    *   Set up the Agent State Graph using `LangGraph` or a customized Python State Machine.
    *   Define the `AgentState` data structure persisted in RAM during execution.
    *   Write the Telegram Bot adapter using `httpx`, testing text messaging and document/file attachment dispatches.
*   **Definition of Done (DoD):**
    *   Executing `python scripts/run_agent.py` triggers the state graph through nodes 1 to 6 as designed.
    *   Smartphone receives a test Telegram notification with a random text file attached.

### Day 3: Public Collectors (RSS/APIs) & Pydantic Normalization
*   **Deliverables:**
    *   Collect real data from VnExpress RSS, arXiv, and GitHub Search API.
    *   Model data structures using Pydantic.
*   **Tasks:**
    *   Write a generic RSS collector using `feedparser` or `httpx`.
    *   Write a collector interfacing with arXiv API to fetch AI research papers.
    *   Write a collector interfacing with GitHub API to retrieve daily trending repositories.
    *   Create Pydantic schemas to validate and shape normalized items (`normalized_items`).
*   **Definition of Done (DoD):**
    *   Scraper script successfully fetches real articles from RSS/APIs, saving raw JSON files in `storage/digests/raw/`.
    *   Raw data is successfully validated and parsed into Pydantic models without structure errors.

### Day 4: Playwright Browser Automation & HITL Review Mode
*   **Deliverables:**
    *   Playwright automation scripts logging into secondary accounts to collect gold/stock prices.
    *   Execution pause mechanism (`require_review`) and terminal-based context injection.
*   **Tasks:**
    *   Install and configure Playwright. Write scripts to launch the browser, log into secondary service platforms, and scrape target pricing tables.
    *   Implement persistent browser context (cookies/session state) to reduce re-login frequency.
    *   Build Human-in-the-loop features: pause the scraper before login/captcha stages using console input, save a screenshot, and wait for `A` (Approve), `R` (Reject), or `I` (Inject Context).
    *   Write context injection logic (Adaptive Context) to insert new prompt instructions dynamically into the browser executor's next steps.
*   **Definition of Done (DoD):**
    *   Successfully scrapes gold/stock prices from target websites under both automatic and review modes.
    *   Intentionally entering an incorrect password triggers a pause -> user inputs corrective password -> Agent successfully logs in and continues.

### Day 5: Local LLM Gateway (Ollama JSON Mode) & Prompt Engineering
*   **Deliverables:**
    *   Successful Ollama integration, calling local models to produce reliable JSON outputs.
    *   Prompt engineering for the 5 key digest sections.
*   **Tasks:**
    *   Write an adapter to interface with the Ollama local API, configuring JSON Mode.
    *   Build Vietnamese prompt templates for each section: hot news summary, gold/stock market analysis, stock watchlist evaluations, AI papers, and GitHub repositories.
    *   Implement context window constraints to prevent local RAM overflows.
*   **Definition of Done (DoD):**
    *   Sending a list of raw articles to Ollama yields a valid JSON string that parses directly into Python dictionaries/Pydantic schemas.

### Day 6: SQLite Deduplication, Hotness Ranker & Safety Verification
*   **Deliverables:**
    *   Duplicate article filtration mechanism based on the SQLite registry.
    *   Algorithm to rank article hotness.
    *   Financial banned keyword filter.
*   **Tasks:**
    *   Integrate SHA256 hashing for article titles and query the `dedupe_registry` in SQLite.
    *   Develop a Hotness Ranker algorithm scoring items based on publication recency and source authority.
    *   Implement regular expression (Regex) scans on the LLM-generated output to detect and remove sensitive financial advisory keywords.
*   **Definition of Done (DoD):**
    *   Re-running the pipeline on identical data filters out 100% of previously scraped articles.
    *   If the LLM generates banned words (e.g., "guaranteed profit", "buy recommendation"), the system triggers safety alerts or filters them.

### Day 7: End-to-End Integration, Markdown Rendering & Operations
*   **Deliverables:**
    *   The system runs end-to-end smoothly using a single activation command.
    *   Detailed Markdown/HTML reports are rendered locally and Telegram alerts are sent successfully.
    *   Detailed Operations Runbook.
*   **Tasks:**
    *   Connect all State Graph nodes into a fully integrated execution pipeline.
    *   Write a Renderer module to transform JSON outputs from the LLM into formatted Markdown and HTML files.
    *   Integrate a file retention policy cleaner deleting raw/digest files older than 7 days.
    *   Write the detailed operating guide in `05_Safety_And_Operations.md`.
*   **Definition of Done (DoD):**
    *   Cron-scheduled test run launches automatically, scrapes data, synthesizes sections, and dispatches a complete Telegram digest with files to the smartphone.
