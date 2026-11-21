# 🕵️ Smart Page Watcher & Extractor

> A high-performance, intelligent web monitoring & data extraction tool built with **TypeScript**, **Playwright**, and **Node.js/Express**. It features an automated diff engine and a sleek **Glassmorphism Web Dashboard**.

---

## ⚡ Architecture & How It Works

```
                        ┌───────────────────────────────┐
                        │    Web Dashboard (:3000)      │
                        │  (Modern Dark UI / Real-time) │
                        └──────────────┬────────────────┘
                                       │ REST API
┌──────────────┐                       ▼
│   index.ts   │ ─────►  ┌───────────────────────────────┐
│ (CLI Runner) │         │     server.ts / watchRunner   │
└──────────────┘         └──────────────┬────────────────┘
                                        │
         ┌──────────────────┬───────────┴──────────┬──────────────────┐
         ▼                  ▼                      ▼                  ▼
┌─────────────────┐ ┌───────────────┐   ┌────────────────────┐ ┌───────────────┐
│ browserClient   │ │ pageExtractor │   │    diffEngine      │ │ snapshotStore │
│   (Playwright   │ │ (Smart Clean/ │   │ (Change Detection/ │ │   & History   │
│   Headless)     │ │   Selectors)  │   │   Price Drops)     │ │   (JSON/DB)   │
└─────────────────┘ └───────────────┘   └────────────────────┘ └───────────────┘
```

---

## 🗂️ Project Structure

```
page-watcher/
├── public/
│   └── index.html               # 🌐 Sleek Glassmorphism Dashboard
├── src/
│   ├── api/
│   │   ├── server.ts            # Express REST API & static server
│   │   ├── targetsStore.ts      # Target persistence (data/targets.json)
│   │   └── historyStore.ts      # Run history & event logging
│   ├── config/
│   │   └── targets.ts           # Code-based targets configuration
│   ├── types/
│   │   └── watcher.types.ts     # Strongly-typed Interfaces & Types
│   ├── browser/
│   │   └── browserClient.ts     # Playwright browser lifecycle & navigation
│   ├── extractor/
│   │   └── pageExtractor.ts     # Data extraction & price cleaning
│   ├── diff/
│   │   └── diffEngine.ts        # Change detection & comparison engine
│   ├── storage/
│   │   └── snapshotStore.ts     # Snapshot persistence (JSON storage)
│   ├── notifier/
│   │   └── notifier.ts          # Terminal reporter & Webhook notifier
│   ├── runner/
│   │   └── watchRunner.ts       # Orchestrates full monitoring cycle
│   └── index.ts                 # CLI entry point
├── data/                        # Generated runtime data (targets, snapshots, history)
├── .env.example                 # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Install Dependencies & Playwright Browser

```bash
npm install
npx playwright install chromium
```

### 2. Configure Environment

```bash
cp .env.example .env
```

### 3. Run the Web Dashboard (Recommended)

To launch the visual dashboard:

```bash
npm run ui
```

Then open your browser at: **`http://localhost:3000`**

From the dashboard you can:
- ➕ **Add new targets** visually with name, URL, and CSS selectors.
- 🔍 **Run immediate checks** on any target with real-time feedback.
- ⚡ **View detected changes** highlighted in red (previous) and green (new).
- 📋 **Inspect activity logs** and execution summaries.

### 4. Run via Terminal (Headless CLI)

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/targets` | List all targets with their latest snapshot |
| `POST` | `/api/targets` | Create a new target |
| `DELETE` | `/api/targets/:id` | Remove a target |
| `POST` | `/api/targets/:id/check` | Trigger an immediate check for a target |
| `POST` | `/api/check-all` | Run checks on all configured targets |
| `GET` | `/api/history` | Get recent activity and diff logs |
| `GET` | `/api/status` | System health and status check |

---

## 🔔 Alert Conditions

| Condition | Trigger |
|---|---|
| `any_change` *(default)* | Triggers when any tracked field is added, modified, or removed. |
| `price_drop` | Triggers exclusively when numeric price decreases. |

---

## ⚙️ Environment Variables (.env)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Web Dashboard & API port | `3000` |
| `HEADLESS` | Run Playwright browser headlessly | `true` |
| `ELEMENT_TIMEOUT` | Element visibility timeout (ms) | `15000` |
| `PAGE_TIMEOUT` | Page load timeout (ms) | `30000` |
| `SNAPSHOTS_PATH` | Snapshot storage file path | `./data/snapshots.json` |
| `WEBHOOK_URL` | Optional webhook endpoint for instant alerts | *(disabled)* |

---

## 🛡️ License

MIT License. Designed and built with clean TypeScript architecture.
