# System Architecture V1 - Pure Logical Design

## Design Principles

- **Local-first & Standalone Execution**: The entire system runs directly as a standalone CLI execution unit, operating internally on the user's local environment. No web servers or intermediary API gateways are used.
- **File-based & Embedded DB (Minimalist Storage)**: The output Markdown digests are stored directly as physical files. A local file-based embedded database is utilized to store metadata and manage execution history for optimal performance.
- **Agentic Workflow (State Graph)**: The operational flow is defined as an Agent State Graph. Each node in the graph accepts the current in-memory state, calls its corresponding logic tool, updates the state, and decides the next step.
- **Supervised Browser Automation**: Browser automation is used to interact directly with web interfaces showing the data (utilizing secondary accounts to avoid security risks).
- **Human-in-the-loop & Adaptive Context (Action Review & Intervention)**: Provides two operating modes: fully automatic (`accept_all`) and review-required (`require_review`). It allows the user to intervene directly from the console to inject corrective context (Adaptive Context) when errors occur (wrong input, captcha) to avoid infinite error loops.
- **Structured Output & Citations**: Analyzes data using a local LLM to extract structured JSON before rendering it to Markdown. All summarized critical information must include source citations/links.

---

## Logical Architecture Overview

The diagram below represents the relationships between logical system components, independent of the concrete implementation technology:

```mermaid
flowchart TB
    subgraph Layer_Interface ["1. TRIGGER LAYER"]
        CLI[Orchestrator Bootstrapper\nCLI Client]
        OS_Scheduler[Operating System Scheduler\nOS Scheduler]
        Smartphone[User Smartphone\nNotification Client Interface]
    end

    subgraph Layer_Orchestrator ["2. AGENT ORCHESTRATOR LAYER"]
        RunAgent[Workflow Controller\nAgent Core Runner]
        StateGraph[State Graph\nWorkflow State Management]
        StateMem[(Agent State Memory\nRAM In-Memory State)]
        ConfigMgr[Config Manager\nRead Config & Secrets]
        
        RunAgent --> ConfigMgr
        RunAgent --> StateGraph
        StateGraph -.-> StateMem
    end

    subgraph Layer_Tools ["3. TOOLING & EXECUTOR LAYER"]
        CollectorRSS[RSS/API Public Collector\nPublic Collector]
        CollectorBrowser[Browser Automation Engine\nBrowser-based Scraper]
        LLMGateway[Local LLM Gateway\nLocal LLM Interface]
        Notifier[Notification Sender\nNotification Dispatcher]
        FileManager[Local File Manager\nRead/Write & File Cleanup]
    end

    subgraph Layer_Storage ["4. LOCAL STORAGE LAYER"]
        LocalFS[(Local Filesystem\nMarkdown, JSON, Logs)]
        EmbeddedDB[(Embedded Database\nMetadata & Dedupe Registry)]
    end

    %% Triggers
    CLI & OS_Scheduler --> RunAgent
    
    %% Graph nodes call Tools
    StateGraph --> CollectorRSS
    StateGraph --> CollectorBrowser
    StateGraph --> LLMGateway
    StateGraph --> FileManager
    StateGraph --> Notifier
    
    %% Tools interact with Storage
    FileManager --> LocalFS
    CollectorRSS & CollectorBrowser & LLMGateway -.-> EmbeddedDB
    Notifier --> Smartphone
```

---

## Detailed Component Breakdown

### 1. Trigger Layer
*   **CLI Client**: The main command-line interface, accepting user inputs to run manual execution parameters (such as dry-runs or selecting specific sections).
*   **Operating System Scheduler**: An OS-level scheduler that automatically triggers the execution script daily according to configured time slots.
*   **User Smartphone**: The device that receives the summary notification at the end of the day with the detailed report file attached.

### 2. Agent Orchestrator Layer
*   **Workflow Controller**: The system entry point, loading environment variables/configurations and starting the state graph.
*   **State Graph & State Memory**: The coordinator of sequential logical workflow through functional nodes (Collect -> Normalize & Deduplicate -> Rank & Cluster -> Summarize -> Verify -> Publish). RAM stores intermediate state variables passed between nodes to ensure execution session integrity.

### 3. Tooling & Executor Layer
*   **RSS/API Public Collector**: Configures HTTP client connections to retrieve data from public RSS feeds or public APIs.
*   **Browser Automation Engine**: A browser emulator performing operations like opening web pages and logging into dedicated user accounts to collect visible market/stock details. The system runs in read-only mode and does not click transaction buttons.
*   **Local LLM Gateway**: A standardized interface connecting to the local large language model. It manages prompt construction and enforces JSON Mode outputs.
*   **Notification Sender**: Client responsible for packing summary content and dispatching it directly with the detailed report to the user's smartphone.
*   **Local File Manager**: Handles reading/writing raw data (.json) and final digests (.md). Performs cleanup of expired locally archived files.

### 4. Local Storage Layer
*   **Local Filesystem**: Physical file storage containing Markdown/HTML reports (`storage/digests/reports/`), raw data (`storage/digests/raw/`), and logs with audit screenshots (`storage/logs/`).
*   **Embedded Database**: A file-based embedded database storing run metadata (`runs`) and duplicate tracking indexes (`dedupe_registry`) based on article content hashes.

---

## Detailed Data and Control Flow

The sequence diagram describing the logical execution:

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Scheduler
    participant CLI as CLI Client / Workflow Controller
    participant Graph as Agent State Graph
    participant Tools as Tools (Browser/HTTP)
    participant DB as Embedded Database
    participant LLM as Local LLM Gateway
    participant FS as Local Filesystem
    participant Notification as Notification Sender

    User->>CLI: Trigger system run
    CLI->>CLI: Load config & secrets
    CLI->>DB: Initialize run record (status='running')
    CLI->>Graph: Start State Graph
    
    rect rgb(240, 248, 255)
        Note over Graph: Node 1: Data Collection (Collect Stage)
        Graph->>Tools: Trigger collection (RSS & Scraper Browser)
        
        alt require_review Mode
            Note over Tools: Pause login / critical scraping steps
            Tools->>CLI: Propose action & log screenshot
            CLI->>User: Show action & wait for terminal input (Approve/Reject/Inject Context)
            
            alt User Approves (Approve)
                User-->>CLI: Confirm approval
                CLI->>Tools: Execute next step
            else User Intervenes (Inject Context)
                User-->>CLI: Send corrective instruction (e.g., 'Re-enter correct info: X')
                CLI->>Tools: Inject new context -> Resolve error & resume
            else User Rejects (Reject)
                User-->>CLI: Reject action
                CLI->>Graph: Skip source / Proceed to next section
            end
        else accept_all Mode
            Tools->>Tools: Run automatically based on predefined scripts
        end
        
        Tools-->>Graph: Return raw_items
        Graph->>FS: Write raw JSON locally
    end

    rect rgb(245, 245, 245)
        Note over Graph: Node 2 & 3: Normalization & Deduplication
        Graph->>DB: Check hash/URL against dedupe registry
        DB-->>Graph: Return duplication status
        Graph->>Graph: Deduplicate, rank, & cluster candidates
    end

    rect rgb(255, 250, 240)
        Note over Graph: Node 4 & 5: Analysis & Verification
        Graph->>LLM: Send prompt with candidate list (JSON Mode)
        LLM-->>Graph: Return summary JSON for sections
        Graph->>Graph: Scan for financial blacklisted keywords & verify format
    end

    rect rgb(244, 255, 244)
        Note over Graph: Node 6: Publish & Notify
        Graph->>FS: Write complete Markdown/HTML report to digests/reports/
        Graph->>Notification: Send summary message with attached .md/.html report
        Notification-->>User: Notification appears on smartphone
    end

    Graph->>DB: Update run record (status='success') & store new dedupe hashes
    CLI-->>User: Complete run, print logs to Terminal
```

---

## Review & Intervention Mechanisms (Human-in-the-loop & Adaptive Context)

1.  **Local Interactive Interface**: Interaction uses a direct standard input stream from the console (`input()`). When the system pauses, it prints the proposed action and saves screenshots to the log folder of the active run session, allowing the user to view it on their local machine.
2.  **Context Injection**: If the user chooses to intervene (Inject Context), the system accepts the input string and injects it as an "additional instruction" directly into the browser planner to steer the Agent's behavior, recovering from input typos or abnormal UI changes.
