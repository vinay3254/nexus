# Nexus: An App Store and Runtime for AI Agents

[![CI](https://github.com/vinay3254/nexus/actions/workflows/ci.yml/badge.svg)](https://github.com/vinay3254/nexus/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)

Nexus is a local app store and execution workspace for AI agents. Discover specialists, inspect their capabilities and permissions, install them into your library, and run tasks through a shared runtime. Publish your own prompt agents and share their JSON definitions between Nexus servers.

The dashboard uses an interactive agent network, contextual inspector, per-agent workflow graphs, live shared outputs, sandbox telemetry, and signed execution receipts. Python/FastAPI powers the runtime; Vite and strict TypeScript power the interface.

---

## ⚡ Core Pillars

* **🏪 An "App Store" for AI Workers:** Nexus lets completely different AI agents plug into a central hub, discover each other's specialized skills via capability manifests, and pass chores back and forth automatically. Supports runtime dynamic plugins from external `.py` files.
* **📋 Shared Memory Blackboard:** All agents read from and write to a single live digital notebook with async pub/sub event broadcasting and optional SQLite WAL persistence, stopping agents from wasting compute and API budget repeating each other's work.
* **🛡️ Self-Healing Security Guard:** Untrusted agent code is isolated inside a secure virtual container sandbox (`bwrap`). If code crashes or fails, the hub catches the error trace and forces agents to rewrite it until it works cleanly.
* **🔏 Cryptographic Trust Layer:** Every final artifact, execution telemetry, and output payload is hashed with SHA-256 and signed with Ed25519 asymmetric keys, producing tamper-evident digital receipts.
* **🖥️ Realtime Web Dashboard & Daemon:** Built-in FastAPI WebSocket server with a card-based workspace, per-agent workflow graphs, execution inspectors, shared blackboard outputs, and cryptographic receipts. The workspace connects automatically to live server data; an optional preview mode demonstrates workflows without executing tasks.
* **🤖 Multi-LLM Provider Auto-Discovery:** Seamless auto-detection and execution across Anthropic Claude (`CLAUDE_API_KEY` / `ANTHROPIC_API_KEY`), local Ollama (`localhost:11434`), OpenAI (`OPENAI_API_KEY`), or offline deterministic Mock LLM.

---

## 🏗️ System Architecture

```
                       ┌──────────────────────┐
                       │      Your Task       │
                       └──────────┬───────────┘
                                  │
                                  ▼
                       ┌──────────────────────┐      ┌────────────────────┐
                       │        Router        │ ◄────┤    Agent dies?     │
                       │ Splits task, picks   │      │   Job re-routed    │
                       │     best agent       │      └────────────────────┘
                       └──────────┬───────────┘
                                  │
         ┌────────────────────────┼────────────────────────┬────────────────────────┐
         │                        │                        │                        │
         ▼                        ▼                        ▼                        ▼
  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │ Coding Agent │         │Research Agent│         │  Data Agent  │         │  Ops Agent   │
  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
         │                        │                        │                        │
  ═══════╪════════════════════════╪════════════════════════╪════════════════════════╪════════
  ║      └────────────────────────┴───────────┬────────────┴────────────────────────┘       ║
  ║                                           ▼                                             ║
  ║                     Shared Memory Blackboard (RAM + SQLite WAL)                         ║
  ║                     (Thread-safe asyncio pub/sub notifications)                         ║
  ════════════════════════════════════════════╤═════════════════════════════════════════════
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │     Trust Layer      │
                                   │    Sandbox output,   │
                                   │     sign receipts    │
                                   └──────────┬───────────┘
                                              │
                                              ▼
                                   ┌──────────────────────┐
                                   │    Merged Result     │
                                   └──────────────────────┘
```

---

## 🛠️ Tech Stack & Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Core Runtime** | **Python 3.11+** | Rich AI agent ecosystem, rapid iteration, dynamic extensibility. |
| **Async Engine** | **`asyncio`** | High-performance asynchronous event loop, concurrent agent coroutines. |
| **Shared Memory** | **`asyncio.Lock` + `asyncio.Queue` + `aiosqlite`** | Live in-memory digital notebook with revision histories and optional WAL persistence. |
| **Data Validation** | **Pydantic v2** | Strict schema validation for agent manifests, subtasks, and execution receipts. |
| **Terminal UI** | **Rich & Click** | High-aesthetic terminal output with styled tables, tree graphs, panels, and syntax styling. |
| **Sandbox Isolation** | **Bubblewrap (`bwrap`)** | Unprivileged Linux containerization using user/mount/pid/net namespaces. |
| **Self-Healing Engine** | **Iterative LLM Refinement** | Real-time stderr capture, stack-trace feedback loop, automated code repair with retry limits. |
| **Cryptographic Trust** | **Cryptography (`Ed25519`) & SHA-256** | High-speed asymmetric signing, tamper-proof execution receipts, standalone verification. |
| **Web Dashboard** | **FastAPI + WebSockets + Vite + TypeScript** | Realtime browser dashboard monitoring live agent execution and blackboard state. |
| **LLM Driver** | **Pluggable Multi-Provider** | Auto-discovers Anthropic, Ollama, OpenAI, or falls back to offline Mock LLM. |

---

## Agent store and publishing

Open `/` or `/store` to browse agents. `/dashboard` opens the interactive agent network; `/installed` opens your library.

- Search by name, publisher, or capability; filter by category.
- Open a listing to review publisher provenance, permissions, instructions, versions, and an example task.
- Install, disable, re-enable, update, and uninstall agents. Only installed and enabled agents participate in routing.
- Run a selected agent from its detail panel or the dashboard’s agent selector. Automatic routing remains available.
- Use **Publish an agent** to create a prompt agent. Publishing adds a catalog listing; installation is a separate action.
- Publish a higher numeric `major.minor.patch` version to offer an update. Installed prompt instructions remain pinned until you apply it.
- Export agent JSON and import it on another Nexus server. Import opens a review form before publishing.

The catalog and installations persist in `~/.local/share/nexus/store.sqlite3`. Set `NEXUS_STORE_PATH` to choose another path, including when running CLI commands. `nexus list-agents` and `nexus run` use the same library. The four built-in agents start installed; uninstalling them survives restarts. Shared outputs are retained when agents are uninstalled.

Published agents are prompt definitions, not executable Python packages. They send the task to the server’s configured model and write its response to their own blackboard output. Publisher names are self-declared; **Local publisher** does not mean verified identity. The catalog is scoped to this server: public hosting, accounts, payments, ratings, and remote package downloads are not included.

Existing Python plugins load through `--plugins ./plugins`. These are trusted server code with host access determined by their implementation. Catalog management does not sandbox plugin implementations. If a server plugin’s version changes, apply its catalog update before it can execute again. An installed plugin missing from the server remains listed as unavailable until its directory is loaded again.

Installation changes are rejected during an active server execution. Failed tasks emit an error and release the execution slot. Independent CLI processes should not change the library during an active daemon task; a daemon reloads external library changes on restart.

### Shareable prompt-agent definition

```json
{
  "id": "draft-editor",
  "name": "Draft Editor",
  "description": "Edits supplied drafts for clear, concise language.",
  "publisher": "My team",
  "version": "1.0.0",
  "category": "Writing",
  "capabilities": ["writing", "editing"],
  "system_prompt": "Edit the supplied draft while preserving its meaning. Explain material changes.",
  "sample_task": "Edit this sentence: The report is very long and quite complex.",
  "timeout_secs": 45
}
```

Categories: Development, Research, Data, Operations, Writing, Productivity. IDs use lowercase letters, digits, and hyphens. Extra fields, including invented trust or permission claims, are rejected.

The dashboard follows the downloaded [Control AI motion reference](design-references/README.md): a full-screen orbital overview, animated agent drill-down, selectable branch cards, fan-out details, a contextual inspector, and a floating task dock. Drag the background to pan, use the toolbar to zoom/reset or show labels, and select an agent to inspect it. Reduced-motion preferences disable ambient and transition animation. Execution evidence remains below the canvas.

The visual direction follows [George Railean’s Control AI dashboard](https://dribbble.com/shots/27388009-AI-Dashboard-Design-for-Control-AI-Policy-Platform), adapted to Nexus capabilities and real runtime state. The network depicts runtime membership and declared capabilities, not inferred agent-to-agent communication.

---

## TypeScript frontend

The approved Nexus workspace is implemented in `frontend/src/` using strict TypeScript and Vite. Its store, installed library, interactive network, per-agent workflow graphs, previews, exports, and receipt verification use the existing FastAPI APIs and WebSocket events. No React or Next.js server is required.

Use Node.js 22.12 or newer. Build the frontend before starting the daemon:

```bash
npm --prefix frontend ci
npm --prefix frontend run build
uv run nexus serve --port 8000
```

The build writes production HTML, JavaScript, and CSS into `nexus/server/static/`. These compiled assets are included so the normal Python server also works without Node.js at runtime. Open `http://localhost:8000`. Use `--mock-llm` for deterministic local execution.

For frontend development, keep the daemon running on port 8000 and start Vite in another terminal:

```bash
npm --prefix frontend run dev
```

Open `http://127.0.0.1:5173`; Vite proxies `/api`, `/health`, and `/ws` to the daemon. The app starts with live data. Runtime settings provide an explicit offline preview mode.

Validation commands:

```bash
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
uv run pytest -q
cd frontend
npx playwright install chromium
npm run test:e2e
```

Browser tests start an isolated mock-provider daemon on port 8769 and cover desktop/mobile navigation, live tasks, workflows, shared memory, receipts, exports, and offline preview. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use an existing Chromium-compatible browser instead.

---

## 🚀 CLI Interface & Quickstart

### Installation

```bash
git clone https://github.com/vinay3254/nexus.git
cd nexus
uv sync
```

### Usage Examples

#### 1. Interactive Capability Showcases (`nexus demo`)
Run pre-configured showcase scenarios demonstrating Nexus features:
```bash
# 1. Self-Healing Security Guard in action
uv run nexus demo --scenario self-heal

# 2. Multi-agent distributed task execution
uv run nexus demo --scenario orchestration

# 3. Dynamic App Store agent matching
uv run nexus demo --scenario app-store
```

#### 2. Launch Realtime Web Dashboard (`nexus serve`)
```bash
uv run nexus serve --port 8000 --persist blackboard.db
```
Open `http://localhost:8000` to access the live dashboard with WebSocket telemetry.

#### 3. List Registered App Store Agents
```bash
uv run nexus list-agents
```

#### 4. Execute a Multi-Agent Task
```bash
uv run nexus run "Clean csv data, extract trends, and write forecast script" \
  --provider auto \
  --persist ./blackboard.db \
  --export-receipt ./receipt.json
```

#### 5. Inspect Plan without Executing (Dry Run)
```bash
uv run nexus run "Analyze sales and write deployment script" --dry-run
```

#### 6. Cryptographically Verify an Execution Receipt
```bash
uv run nexus verify-receipt ./receipt.json
```

---

## 📂 Repository Structure

```
nexus/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI workflow
├── docs/
│   └── superpowers/
│       ├── specs/               # Architectural & Design specifications
│       └── plans/               # Detailed step-by-step implementation plans
├── frontend/                    # Vite + strict TypeScript source and browser tests
├── nexus/
│   ├── __init__.py              # Package init
│   ├── cli.py                   # Click CLI with rich terminal formatting
│   ├── error.py                 # Centralized exception types
│   ├── app_store/               # Worker registry & capability discovery
│   ├── blackboard/              # Shared memory notebook & pub/sub events
│   ├── persistence/             # SQLite WAL asynchronous persistence store
│   ├── router/                  # Task decomposition & failover supervisor
│   ├── agents/                  # Specialized worker agents (Coding, Research, Data, Ops)
│   ├── plugins/                 # Dynamic plugin discovery and loader
│   ├── trust/                   # Bubblewrap sandbox, self-healing loop & Ed25519 receipts
│   ├── llm/                     # Multi-provider LLM engine (Anthropic, Ollama, OpenAI, Mock)
│   ├── ui/                      # Rich terminal visualizers
│   ├── server/                  # FastAPI web server and realtime WebSocket dashboard
│   └── demo/                    # Interactive showcase scenarios
├── tests/                       # Complete unit, integration, and E2E test suites
├── pyproject.toml               # Python project configuration (uv / hatchling)
└── README.md                    # Project documentation
```

---

## 🤝 Contributing & License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
