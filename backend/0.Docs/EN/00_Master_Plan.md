# Master Plan - Local AI Daily Intelligence Agent V1

## 1. Project Summary

The project aims to build a local-first AI agent capable of automatically collecting, ranking, and summarizing important daily information, and sending a daily digest to the user's smartphone. The content focuses on breaking news, stock/gold markets, highlighted stock watchlists, new AI technology/papers, and trending GitHub projects.

V1 is deployed as a local-running Agentic Workflow. It collects information through public sources or by automatically controlling the computer (Computer Use) to log in and retrieve data directly from secondary accounts, completely replacing paid API services. All information is processed and summarized using a local large language model (Local LLM), exported directly to local Markdown files, and sent as a summary notification to the smartphone via a Telegram Bot (with the detailed Markdown report attached directly).

## 2. Business Goals

- Reduce daily reading time and manual information synthesis.
- Create a Vietnamese digest with clear citations, easy to read on smartphones as locally stored document files (Markdown).
- Automate the collection of sensitive information (such as stock accounts, gold prices) directly on the user's computer without paying for data API services.
- Build an workflow-based Agent foundation to serve as a baseline for upgrading to more complex automation features later.

V1 Success Metrics:

- The daily digest newsletter is generated and sent on schedule at least 5/7 days during the first week.
- Each newsletter contains all content groups if the data sources are available.
- At least 90% of critical information has clear citations/sources.
- Users receive brief summary notifications on their smartphones on time and can access detailed Markdown files quickly.

## 3. Identified Requirements

- The system is an internally operating AI agent, prioritizing the use of a local large language model (Local LLM).
- Capable of safely using the computer (Computer Use) to log in to dedicated secondary/research accounts (setup and configured locally by the user) to collect stock/gold information directly from the computer/browser.
- Summarize outstanding domestic and international political/current news of the day.
- Highlight potential stock watchlists based on market news, seasonality, and policies (for personal research purposes only, no trading recommendations).
- Summarize new AI technology/research papers and the top 5 trending GitHub repositories of the day.
- Integrate a tool to send summary notifications to smartphones directly from the Agent workflow.

## 4. Temporary Assumptions

- V1 serves a single user (single-user) and is configured entirely locally.
- Default operating timezone: Asia/Bangkok.
- The computer running the Agent must be online at the daily scheduled activation time.
- The Agent does not automatically place trading orders and does not provide personalized financial investment advice.
- Uses a local SQLite database (`storage/database/history.db`) to manage run history and deduplicate article information. All raw data (JSON) and synthesized newsletters (Markdown) are stored directly as local files to optimize the Agent's read/write performance and information management.
- Sends notifications through a tool integrated directly into the Agent workflow.

## 5. Clarified Information

- Running model: Local LLM runtime.
- Host machine configuration: Personal computer (no 24/7 run required).
- Stock/Gold price data source: Automatically controls the computer (Computer Use) to access the user's secondary/research accounts to retrieve market/stock info; combines public RSS/APIs for other news sources.
- Delivery time: 6 PM - 7 PM daily.
- Newsletter format: Detailed Markdown files stored locally and summary notification messages on smartphones.
- Data storage: Stored directly as local Markdown files (retaining history for the last 7 days).
- Output language: Vietnamese.

## 6. Project Scope

In Scope V1:

- Configure news source directories and operational parameters via local configuration files.
- Automated scheduling cycle (Scheduler) or manual activation via command line.
- Collectors supporting RSS, free APIs, and computer control tools (Computer Use).
- Deduplication, data structure normalization, and hotness ranking of news articles.
- Content synthesis using Local LLM for each topic section.
- Export results to a single Markdown file per run.
- Notification Tool integrated directly into the Agent's workflow.
- Operational logs and computer control audits (Audit log) recorded as local log files.

Out of Scope V1:

- Automatic trading or order execution (only logs in to retrieve account/market info, does not execute buy/sell transactions).
- Dedicated Mobile App.
- Commercial personalized investment recommendation systems.
- No Web Server (FastAPI) or web admin UI in V1.
- Computer control actions outside of data collection goals.

Key Constraints:

- Runs directly on the user's local machine environment.
- Ensures account credential security when using Computer Use.
- Provides citations (URLs) for summarized news.
- Complete V1 within 7-10 days.

## 7. Proposed Architecture

Instead of specific technology components, the system architecture focuses on functional roles within the Agentic Workflow:

- **Agent Orchestrator**: Built as a State Graph managing the entire execution cycle from data collection, analysis, file exporting, to report delivery.
- **Data Collection Tools**:
  - Tools to read public RSS/free APIs.
  - Computer-use Tool to log in and scrape info from the screen/browser.
- **Processor & Deduplicator**: Normalizes raw data and removes duplicate news.
- **Ranker**: Evaluates and filters the most prominent news, stocks, and papers based on configuration criteria.
- **Summarizer**: Calls the Local LLM to analyze candidate data and write structured Vietnamese content.
- **Notification Tool**: Sends summary information and attaches the detailed report file directly to the user's smartphone via Telegram Bot.
- **Local File/DB Manager**: Stores Markdown digests, intermediate data, and system logs directly on the local disk, combined with SQLite to manage run history.

## 8. Communication and Triggering

The system does not use web services or internal APIs, but operates based on local trigger methods:

- **Automated Trigger**: The Local Scheduler automatically invokes the Agent workflow at the designated time.
- **Manual Trigger**: Runs the control script directly from the terminal or via a computer shortcut.
- **Output Communication**: The user receives summary notifications on their smartphone via Telegram Bot, which includes a summary and the detailed Markdown report file.

## 9. Data Flow

1. The Scheduler or user triggers the Agent cycle.
2. The Agent initializes the state and runs data collection tools (RSS, public APIs, Computer Use).
3. Raw data is fed into the normalization, deduplication, and ranking processes to select the highest quality information.
4. The LLM conducts a deep analysis of each content group according to a predefined structure.
5. The synthesized results are formatted and written directly to the new Markdown file for that run.
6. The notification tool extracts summary content from the Markdown file and sends it to the user's smartphone.
7. Old Markdown files (older than 7 days) are automatically cleaned up to optimize disk space.

## 10. Deployment Flow

- The system runs directly using the user's local runtime (no containerization or running multiple background services unless necessary).
- Storage configuration is kept in secure local configuration files.
- Active logs are written directly to the local log directory.

## 11. Business Process

1. The user configures news sources, execution times, and credentials (if any) via a secure local configuration file.
2. The system automatically triggers the Agent at the scheduled time.
3. The Agent controls the computer, collects data, synthesizes it into a Markdown file, and saves it.
4. The user receives a summary message on their phone.
5. The user views the detailed digest by opening the Markdown file on their computer or via a synchronized Markdown viewer on their phone.

## 12. AI Pipeline

### Step 1: Collect

- Step Goal: Retrieve new data for the day from configured sources.
- Inputs: List of news sources, execution time, security configuration.
- Core Processing: Read public RSS/APIs, run the computer control tool (Computer Use) to log in and retrieve stock/gold info from secondary accounts. Supports automatic execution mode (`accept_all`) or pause for confirmation from console (`require_review`).
- Outputs: Raw data with source URL, timestamp, and metadata.
- Risks / Control Points: Source errors, rate limits, login failures (wrong password, captcha). Controlled through a Human-in-the-loop approval mechanism and allowing the user to inject Adaptive Context to resolve login or stuck errors.

### Step 2: Normalize and Deduplicate

- Step Goal: Structure raw data to make it easily readable for the Agent and avoid duplicate content.
- Inputs: Raw data from sources.
- Core Processing: Extract title, content, date; calculate similarity between articles to remove duplicates.
- Outputs: List of unique formatted items.
- Risks / Control Points: Articles with similar content but different titles, timezone offsets.

### Step 3: Rank and Cluster

- Step Goal: Determine the most prominent information of the day.
- Inputs: Normalized list.
- Core Processing: Score based on recency, source authority, market impact, and mention counts.
- Outputs: List of key candidates for each content group.
- Risks / Control Points: Clickbait news, GitHub repositories with spam stars.

### Step 4: Section Analysis

- Step Goal: Extract in-depth information for each topic.
- Inputs: List of key candidates.
- Core Processing: Extract core events, catalysts, associated risks, and technology trends.
- Outputs: Detailed summary for each section as a temporary data structure.
- Risks / Control Points: Unfounded assumptions, missing citations.

### Step 5: Safety Guardrails

- Step Goal: Control sensitive content and legal risks.
- Inputs: Analysis results of stocks and markets.
- Core Processing: Eliminate commitment or buy/sell recommendation language, add risk disclaimers to the watchlist.
- Outputs: Safe financial information content.
- Risks / Control Points: Unintentionally giving trading recommendations.

### Step 6: Digest Synthesis

- Step Goal: Create a complete Vietnamese newsletter.
- Inputs: Analytical data from sections.
- Core Processing: LLM writes and formats the newsletter based on a unified Vietnamese structure template.
- Outputs: Full Markdown formatted newsletter.
- Risks / Control Points: Translation errors, data hallucinations.

### Step 7: Verify

- Step Goal: Final review before saving files and notifying.
- Inputs: Synthesized newsletter and source data.
- Core Processing: Verify citation links, dates, and file structure integrity.
- Outputs: Approved Markdown file.
- Risks / Control Points: Missing broken links or incorrect dates.

### Step 8: Notify and Archive

- Step Goal: Send notifications to smartphones and update storage.
- Inputs: Completed Markdown file.
- Core Processing: Trigger notification tools to send brief summaries to phones; move/cleanup old files in local storage.
- Outputs: Successfully sent notification, cleaned storage directory.
- Risks / Control Points: Target device loses network connection.

## 13. Proposed Directory Structure

```text
AI_agent_computer_use/
├── .env.example              # Sample environment variables (Secrets, Tokens)
├── .gitignore                # Excludes storage/db, logs, .env, and virtual environments from git
├── requirements.txt          # Required Python packages
├── README.md                 # Quick start guide and operational overview
│
├── config/                   # Static configuration files
│   ├── app.yaml              # Runtime configuration (LLM, Telegram, Storage paths)
│   └── sources.yaml          # News sources and data extractor configuration
│
├── agent/                    # Core AI Agent processing logic
│   ├── __init__.py
│   ├── graph.py              # Construction and routing of State Graph Nodes
│   ├── state.py              # TypedDict/Pydantic definition for run state (AgentState)
│   │
│   ├── nodes/                # Graph Nodes
│   │   ├── __init__.py
│   │   ├── collect.py        # Node to trigger scrapers/collectors (Stage 1)
│   │   ├── normalize.py      # Node to normalize data via Pydantic (Stage 2)
│   │   ├── deduplicate.py    # Node to filter duplicates against SQLite (Stage 3)
│   │   ├── rank_cluster.py   # Node to cluster and calculate Hotness score (Stage 4)
│   │   ├── summarize.py      # Node calling Local LLM to synthesize sections (Stage 5)
│   │   ├── verify.py         # Node for safety checks, disclaimers, and banned words (Stage 6)
│   │   └── notify.py         # Node to export MD/HTML files and send Telegram (Stage 7)
│   │
│   ├── tools/                # Execution tools called by Nodes
│   │   ├── __init__.py
│   │   ├── browser_collector.py  # Controls Playwright (Computer Use, Login)
│   │   ├── api_collector.py      # Makes HTTP requests (RSS, arXiv, GitHub APIs)
│   │   ├── db_manager.py         # Interfaces SQLite (runs, dedupe_registry)
│   │   ├── llm_gateway.py        # Connects to Ollama (prompts, forcing JSON structure)
│   │   └── telegram_sender.py    # Sends messages and files via Telegram API
│   │
│   └── models/               # Data Schemas
│       ├── __init__.py
│       ├── item.py           # Pydantic Model for normalized items (NormalizedItem)
│       └── digest.py         # Pydantic Model for output digest JSON structure
│
├── database/                 # SQLite Database management
│   ├── __init__.py
│   ├── connection.py         # Initializes SQLAlchemy Engine / SQLite connection
│   └── schema.py             # Defines table structures (runs, dedupe, browser_audit)
│
├── scripts/                  # Activation scripts
│   ├── run_agent.py          # Main CLI script (argparse and triggers agent/graph.py)
│   └── setup_env.sh          # Quick setup script (installs packages, playwright browsers)
│
└── storage/                  # Local storage (excluded in gitignore)
    ├── database/             # Location for history.db
    ├── digests/              # Stores digests as .json, .md, .html
    │   ├── raw/              # Stores raw items for each run as JSON files
    │   └── reports/          # Daily detailed Markdown/HTML reports
    └── logs/                 # System logs and audit screenshots
```

## 14. Module and File List

- `agent/graph.py`: Defines the Agent State Graph (Workflow).
- `agent/state.py`: State data structure passed through steps (AgentState).
- `agent/nodes/collect.py`: Node collecting data via tools.
- `agent/nodes/normalize.py`: Node normalizing data via Pydantic.
- `agent/nodes/deduplicate.py`: Node deduplicating articles based on SQLite hash.
- `agent/nodes/rank_cluster.py`: Node ranking hotness and clustering news.
- `agent/nodes/summarize.py`: Node synthesizing content using Local LLM.
- `agent/nodes/verify.py`: Node reviewing content safety and financial disclaimers.
- `agent/nodes/notify.py`: Node writing Markdown/HTML files and sending Telegram notifications.
- `agent/tools/browser_collector.py`: Simulation tool controlling the computer to login and scrape data (Playwright).
- `agent/tools/api_collector.py`: Tool fetching news via public APIs/RSS.
- `agent/tools/db_manager.py`: Tool interacting with SQLite to manage runs and deduplication.
- `agent/tools/llm_gateway.py`: Tool interfacing with Local LLM (Ollama).
- `agent/tools/telegram_sender.py`: Tool sending notifications and attaching files via Telegram.
- `scripts/run_agent.py`: CLI script launching the entire workflow.
- `scripts/setup_env.sh`: Shell script for environment setup.

## 15. Roadmap / Milestones

- Days 1-2: Define Agent workflow (State Graph), build state management, and local Markdown file storage.
- Days 3-4: Build public collection tools (RSS/API) and set up the computer control tool (Computer Use) to log in and retrieve stock/gold info.
- Day 5: Integrate local LLM, design analysis prompts, and format newsletter content.
- Day 6: Integrate smartphone notification tools and file cleanup mechanism.
- Day 7: End-to-end testing of the automated workflow and complete operations documentation.

## 16. Task Breakdown

Agent Workflow:
- Establish Agent state graph and manage state.
- Set up daily scheduled run.

Nodes & Tools:
- Develop collection tools (public RSS/API & Computer Use).
- Develop deduplication algorithm and news hotness scoring.
- Build LLM integration module and design writing prompts.
- Implement Markdown file exporter and notification tools.

Testing/QA:
- Unit testing for data processing steps.
- End-to-end (E2E) integration testing.
- Prompt tuning and citation URL accuracy verification.

## 17. Required Technical Documentation

- Product Requirements: [Requirements.md](Requirements.md).
- Agent Workflow Architecture: [01_System_Architecture.md](01_System_Architecture.md).
- Agent Processing Pipeline: [02_AI_Pipeline.md](02_AI_Pipeline.md).
- Data Contracts & File Structure: [03_API_Data_Contracts.md](03_API_Data_Contracts.md).
- V1 Development Roadmap: [04_V1_Roadmap_Task_Breakdown.md](04_V1_Roadmap_Task_Breakdown.md).
- Operations & Safety Guide: [05_Safety_And_Operations.md](05_Safety_And_Operations.md).

## 18. Implementation Checklist

- [ ] Configure Agent parameters and news sources in the config file.
- [ ] Set up credentials to support the computer control tool (Computer Use).
- [ ] Implement the state graph framework (Workflow).
- [ ] Finalize data collection tools.
- [ ] Finalize LLM content synthesis Prompt.
- [ ] Configure notification tools to send alerts to phones.
- [ ] Run End-to-End testing and confirm Markdown reports are successfully generated.

## 19. Next Steps

1. Set up the project structure based on the new directory tree.
2. Implement basic Nodes and Tools for the Agent state graph.
3. Finalize the Computer Use tool to retrieve stock/gold info before Day 4.
4. Evaluate actual newsletter quality and fine-tune Prompt/Scoring.
