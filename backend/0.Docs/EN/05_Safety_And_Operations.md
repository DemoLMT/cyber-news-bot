# Safety Policy & Operations Runbook V1

## 1. Safety Goals

The system is designed to support daily information synthesis without creating security risks to your personal computer, assets, and financial trading accounts. The core principle of V1 is **"Supervised Read-only Browser Access"**.

---

## 2. Computer Control Policy (Computer-use Policy)

To ensure absolute safety when the Agent uses automated browser control tools (Playwright), the system enforces the following strict rules:

### 2.1. Dedicated Accounts Usage Rules
*   **Mandatory:** Only configure credentials of dedicated secondary or research accounts in the local `.env` file. These accounts should only be used to read public pricing tables or general market information.
*   **Reusing Login Sessions (Persistent Context):** Playwright uses local browser contexts to store cookies and session states. After the first successful login, subsequent runs inherit the active session state, minimizing the need for daily logins.
*   **Strictly Prohibited:** Logging in or storing credentials of main trading accounts, bank accounts, or accounts holding real funds and assets.

### 2.2. Human-in-the-loop (HITL) Mode
The system supports two execution modes configured in `config/app.yaml` or via CLI parameters:
1.  **Automatic Mode (`accept_all`):**
    *   Runs fully automatically based on pre-scripted scenarios (suitable for Cron scheduler triggers at night or outside working hours).
    *   Only applicable to public RSS/API sources or simple browser scenarios that do not require complex authentication.
2.  **Review-Required Mode (`require_review`):**
    *   **Action Pauses:** The Agent automatically saves a screenshot and pauses before executing critical actions (like clicking a login button or when a page loading error occurs).
    *   **Input Request:** Prints the proposed action to the console and waits for a user command:
        *   `A` (Approve): Authorizes the Agent to execute the action.
        *   `R` (Reject): Skips the action, records a local error, and proceeds to the next source.
        *   `I` (Inject Context): Allows the user to type corrective instructions directly from the terminal console.
    *   **Console Input Timeout:** When run via Cron, if there is no user interaction, the console input listener will automatically **timeout after 5 minutes** (300 seconds). Once timed out, the Agent defaults to the `R` (Reject) action to skip the blocked source and continue executing other pipeline nodes, avoiding infinite process hangs.

### 2.3. Adaptive Context Injection Mechanism
If the Agent gets stuck due to input errors or unexpected UI changes:
*   The user can provide corrective context via the console by selecting option `I` and entering direct instructions (e.g., *"The correct login password is [New Password]"* or *"Click the link with the text 'Today's Gold Price'"*).
*   This instruction is injected directly into the execution context as a prompt guidance parameter, steering the Agent's next step and allowing recovery from loops without restarting the whole program.

### 2.4. Read-only Browser Scraper Constraints
*   Playwright scripts are implemented with hardcoded navigation structures, only invoking DOM extraction functions (`innerText`, `textContent`).
*   The codebase strictly forbids selecting or clicking financial action elements (such as Buy, Sell, Transfer, or Withdraw buttons).

---

## 3. Financial Safety Policy

The stock and gold market synthesis content is tightly regulated to maintain objectivity and legal compliance:
*   **Terminology Convention:** The stock lists are referred to as "Research Watchlists," and must never be presented as trading recommendations.
*   **Banned Words Scan:** The system automatically rejects or removes sentences containing promising phrases such as: *"guaranteed profit"*, *"risk-free"*, *"sure to rise"*, or *"wealth-building opportunity"*.
*   **Mandatory Disclaimer:** The bottom of each financial section automatically appends the following notice:
    > *Warning: The above information is for personal research purposes only, and does not constitute financial investment advice or trading recommendations.*

---

## 4. Secrets Management

Sensitive credentials are managed inside the local `.env` file:
```bash
# Never push this file to GitHub (already added to .gitignore)
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
TELEGRAM_CHAT_ID="987654321"
STOCK_SUB_USERNAME="my_sub_account"
STOCK_SUB_PASSWORD="my_sub_password"
```
*   **Rules:**
    *   Never hardcode credentials or tokens in the codebase.
    *   The file logger automatically redacts (`[REDACTED]`) these sensitive values before writing logs to the disk.

---

## 5. Operations Runbook

### 5.1. Manual Trigger
Launch the system from the project root directory:
```bash
# Run the entire pipeline in review-required mode (default)
python scripts/run_agent.py --mode require_review

# Run fully automatically (bypass manual approvals)
python scripts/run_agent.py --mode accept_all

# Dry-run execution without saving database records or sending Telegram notifications
python scripts/run_agent.py --dry-run
```

### 5.2. Checking Audit Logs
*   **Main Run Log:** View the latest execution logs at `storage/logs/run_agent.log`.
*   **Browser Screenshots:** Check `storage/logs/` to review audit screenshots captured during scraping or when the Agent paused for user review.

### 5.3. Querying History via SQLite
To check the status of prior executions, open SQLite from the terminal:
```bash
# Query the 5 most recent runs
sqlite3 storage/database/history.db "SELECT id, target_date, status, started_at FROM runs ORDER BY started_at DESC LIMIT 5;"

# Check the count of cached articles used for deduplication
sqlite3 storage/database/history.db "SELECT COUNT(*), topic FROM dedupe_registry GROUP BY topic;"
```

### 5.4. Troubleshooting Common Issues
*   **Issue 1: Browser stuck on the login page**
    *   *Cause:* The target website updated its UI or presented a new Captcha challenge.
    *   *Resolution:* Run the script in `--mode require_review`. When the Agent pauses, open the latest screenshot at `storage/logs/last_screenshot.png`, read the captcha or view the layout issue, select `I` on the terminal, and type the corrective input (e.g., typing the captcha code).
*   **Issue 2: Local GPU/VRAM overflow calling Ollama**
    *   *Cause:* Too many raw articles fed into the prompt, exceeding the local GPU's memory limits.
    *   *Resolution:* Lower the maximum candidate limit in the configuration file `config/app.yaml`.

### 5.5. Catch-up Mechanism
Since the Agent is deployed locally (local-only) on a personal computer, if the computer is turned off during the scheduled Cron window (6 PM - 7 PM), that day's run is missed.
*   **How it works:** Whenever `run_agent.py` starts (manually or via scheduler), the system queries the `runs` table in SQLite for the last successful execution date.
*   **Resolution:** If it detects a missing digest from the previous day or earlier, the Agent dispatches a brief warning via Telegram noting the missed execution and suggests a catch-up run via:
    ```bash
    python scripts/run_agent.py --date YYYY-MM-DD
    ```
