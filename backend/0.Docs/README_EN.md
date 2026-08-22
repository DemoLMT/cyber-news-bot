# Design Documentation - Local AI Daily Intelligence Agent V1

This documentation converts the initial product requirements into a detailed, deployment-ready 7-day implementation plan for the Local AI Daily Intelligence Agent system.

## Recommended Reading Order

1. **[Requirements.md](EN/Requirements.md)**: Product requirements and acceptance criteria for V1.
2. **[00_Master_Plan.md](EN/00_Master_Plan.md)**: Project master plan (goals, scope, milestones).
3. **[01_System_Architecture.md](EN/01_System_Architecture.md)**: Logical system architecture and data/control flow diagrams.
4. **[02_AI_Pipeline.md](EN/02_AI_Pipeline.md)**: AI pipeline stages (Collect -> Deduplicate -> LLM Synthesis -> Verification -> Telegram).
5. **[03_API_Data_Contracts.md](EN/03_API_Data_Contracts.md)**: Specifications for CLI arguments, YAML configurations, SQLite schema, and AgentState structure.
6. **[04_V1_Roadmap_Task_Breakdown.md](EN/04_V1_Roadmap_Task_Breakdown.md)**: Detailed 7-day development roadmap.
7. **[05_Safety_And_Operations.md](EN/05_Safety_And_Operations.md)**: Operational safety guidelines, review mechanisms (HITL), and troubleshooting guides.
8. **[06_Tech_Stack_Mapping.md](EN/06_Tech_Stack_Mapping.md)**: Mapping from logical architecture to concrete libraries and technologies in V1.

---

## V1 Key Design Decisions (Standards)

To guarantee a "Local-only" execution flow, ensure maximum personal security, and optimize implementation time, V1 adopts the following technical decisions:

*   **Core Engine**: Standalone Python CLI Script (`scripts/run_agent.py`) operating via an Agent State Graph. Web servers (like FastAPI) are not used.
*   **Database**: Local SQLite database (`storage/database/history.db`) to manage execution history and deduplicate articles. PostgreSQL is not used.
*   **Runtime**: Executed directly on a local Python virtual environment (`venv`). Docker Compose is not used.
*   **Scheduler**: Uses an OS-level scheduler (such as Linux Cron Job) to schedule daily runs between 6 PM and 7 PM.
*   **Local LLM**: Local Ollama API (`qwen2.5:7b-instruct` or `llama3:8b-instruct`), utilizing JSON Mode to ensure stable structured output data.
*   **Collectors**:
    *   *RSS / Public APIs*: Uses `httpx` to download public news (arXiv, GitHub).
    *   *Browser Automation (Playwright)*: Simulates a browser to log into secondary accounts and scrape financial/gold data (read-only access; clicking trading buttons is strictly forbidden).
*   **Notification**: Telegram Bot API, delivering a brief rich-text summary message and attaching the detailed report file (`.md` or `.html`) directly to the client's smartphone.
*   **Network Boundary**: The system runs entirely locally but requires outbound Internet access during execution to download articles and send Telegram notifications.

---

## Project Status

*   Design documentation is 100% complete and synchronized, ready for scaffolding the project directory structure and starting development.
