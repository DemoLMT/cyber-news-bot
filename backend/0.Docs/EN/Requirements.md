# Product Requirements - Local AI Daily Intelligence Agent

## Vision

Build an AI agent that runs on a personal computer or private server, utilizing a local large language model (Local LLM) to automatically summarize important daily information and send notifications to the client's smartphone. The system prioritizes safety, clear citations, and does not perform risky actions or execute trades on the computer.

## Target Users

- **Individual Client**: Needs to quickly catch up on breaking news, markets, gold, new AI papers, and trending GitHub repositories daily.
- **Operator/AI Engineer**: Manages data sources, execution schedules, local models, and digest quality.

## V1 Goals in 1 Week

V1 must generate an automated daily digest, triggered by a scheduler or activated manually via the command line, comprising 5 content sections:

1. High-impact domestic and international political and current news of the day.
2. Crucial information on the Vietnamese stock market, domestic gold prices, and market-moving news.
3. Highlighted stock watchlists for the next 1-2 months based on news, industry catalysts, seasonality, and market signals. This is for personal research only, not buy/sell recommendations.
4. New AI technology updates, AI research papers published during the day, and emerging engineering trends.
5. Top 5 trending GitHub repositories of the day, avoiding duplicate items from prior reports.

After synthesis, the system sends summary notifications to the client's smartphone with links to access the detailed Markdown file on their computer.

## Functional Requirements

### Data Collection

- Configure news source lists by group: current news, markets, gold, AI, and GitHub via a local configuration file.
- Support data retrieval via free public feeds (RSS/public APIs) and utilizing computer control tools (Computer Use) to automatically log in to dedicated secondary/research accounts (locally configured with credentials provided by the user) to scrape data instead of using paid APIs.
- Store raw data locally, including source URLs, timestamps, and checksums to support auditing and deduplication.
- Implement retry mechanisms, timeout thresholds, rate limiting, and graceful skipping of failed sources without halting the entire run cycle.

### Processing & Ranking

- Normalize articles into a unified data schema: title, source, URL, publication date (published_at), raw/summarized content (summary/raw_text), topic, and language.
- Deduplicate articles based on canonical URLs, title similarity, and content hashes.
- Calculate hotness scores based on recency, the count of independent reporting sources, key market impact triggers, and relevance.
- For stocks: generate watchlists with explanations, catalysts, risks, a 1-2 month timeframe, and confidence levels. Strictly forbid language promising financial returns.
- For GitHub: select only new or first-seen repositories of the day; log detection history to prevent repeats.

### AI Synthesis

- Utilize local LLMs through standard interfaces (such as Ollama) to allow easy model switching.
- Enforce structured data outputs from the model before rendering the final Markdown report.
- Ensure every critical analytical statement is cited with a clear, traceable source URL.
- Implement simple validation checks: verify URL existence, date alignment, statistical accuracy, and scan for exaggerated claims.

### Notifications

- Send a concise summary notification (5-10 key bullet points) with the detailed file path to the smartphone via the Notification Tool.
- Track notification delivery status (success/failure) and implement retry mechanisms.

### Safe Computer Use & Direct Intervention (Human-in-the-loop)

- V1 restricts computer control actions to predefined boundaries (such as launching a browser, logging in to specific accounts, and extracting financial data).
- Support a **Human-in-the-loop (HITL)** workflow with two execution modes:
  - `accept_all`: The Agent automatically runs the entire scraping and login process.
  - `require_review`: The Agent pauses before critical actions, displays the proposed action and a screenshot on the terminal console, and waits for user confirmation (`Approve` / `Reject`).
- Support **Adaptive Context (Corrective Injection)**: When the Agent encounters errors (e.g., wrong password, incorrect captcha, or UI changes), the user can input corrective instructions from the console to steer the Agent's behavior immediately, preventing infinite error loops.
- Log all Agent actions in an audit log: timestamp, URL, action type, outcome, corresponding screenshot, and error details if any.

## Non-Functional Requirements

- Runs locally on the client's personal computer or private server.
- Built as an Agent State Graph running directly as a standalone CLI or Cron task, requiring no persistent background web servers (FastAPI) or complex relational databases (PostgreSQL).
- Uses a local SQLite database (`storage/database/history.db`) to manage run history and deduplicate articles. Stores raw data (JSON) and synthesized digests directly as text files (Markdown) on the local disk.
- Configure settings via local files and environment variables, keeping secrets out of the codebase.
- Clear operational logging, assigning a unique run ID to each execution session.
- Handle individual source failures gracefully, generating the summary digest as long as other sources function correctly.
- Outputs must be in Vietnamese, concise, with clear source citations and financial risk disclaimers.

## V1 Acceptance Criteria

- Trigger the `daily_digest` generation automatically via scheduler or manually via command line.
- Generate a Markdown newsletter covering all 5 content sections if data is available.
- Securely store raw data, execution logs, and Markdown digest files locally.
- Dispatch summary notifications to the user's smartphone via messaging tools.
- Ensure each section in the digest contains traceable source URLs.
- Include risk disclaimers in stock watchlists, ensuring no buy/sell recommendations or return guarantees.
- Maintain complete audit logs for computer control (Computer Use) actions.

## Out of Scope V1

- Automated trading or placing order executions for stocks/gold.
- Automatically posting digest summaries to social media platforms.
- Multi-user support or complex role-based access control.
- Dedicated standalone mobile applications.
- General computer control actions outside of predefined data collection scripts.
- Professional investment advisory reports.

## Clarified Information

- **Notification Channel**: Smartphone via Telegram Bot (delivering summary text and attaching the detailed Markdown file).
- **Execution Environment**: Personal computer running a Local LLM runtime (e.g., Ollama).
- **Stock/Gold Market Sources**: Automating browser control (Computer Use) to log in to dedicated secondary accounts and extract data.
- **Digest Delivery Time**: 6 PM - 7 PM daily.
- **Digest Format**: Detailed local Markdown file.
- **Retention Period**: Retain the last 7 days of history.
