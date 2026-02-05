# GDPR Scanner - Build Summary & Workflow

## 📋 Project Overview

**Product:** GDPR Compliance Scanner Chrome Extension
**Goal:** Scan UK SME websites for GDPR compliance violations
**Target:** 420 customers @ £19/mo = **~£10K MRR**

---

## ✅ Completed So Far

### 1. Chrome Extension (Frontend)
- [x] manifest.json - Extension configuration
- [x] popup.html - Main UI
- [x] popup.js - Popup logic
- [x] content.js - Page scanning & GDPR checks
- [x] background.js - Service worker, API communication
- [x] styles.css - UI styling
- [x] icons/ - Placeholder for 16x16, 48x48, 128x128 icons

**GDPR Checks Implemented:**
- Cookie consent banner presence
- Cookie duration (max 13 months for non-essential)
- Privacy policy link visibility
- Cookie consent storage/retrieval
- Data subject rights (delete/export)
- International data transfer rights
- Cookie categorization
- DPO contact information

---

### 2. Backend API (Rose Server)
- [x] server.js - Express server
- [x] SQLite database - User and scan storage
- [x] Environment variable configuration - TRELLO_API_KEY, TRELLO_TOKEN

**API Endpoints:**
- GET /health - Health check
- POST /api/scan - Store scan results
- GET /api/history - Get scan history
- POST /api/export - Export compliance report
- POST /api/checkout - Stripe checkout (Pro/Agency tier)
- POST /api/trello-webhook - Trello integration
- GET /api/trello-monitor - Internal Trello polling

---

## 🎯 Collaboration Workflow

```
┌─────────────────────────────────────────────────────┐
│  Rose (OpenClaw on Rose Server)            │
│  ┌──────────────────────────────────┐       │
│  │  GitHub                          │       │
│  │  ┌────────────────────────────┐  │       │
│  │  │ gdpr-scanner            │  │       │
│  │  │ ┌──────────────────────────┐  │  │       │
│  │  │ │ Extension │ API │      │  │       │
│  │  │ └───────────────────────────┘  │  │       │
│  │              ↑                   ↑         │  │
│  │        Rose pushes    I review  │  │
│  └───────────────────────────────────┘       │
│                    ↑                   ↑         │  │
│  I approve         Rose continues         │  │
└─────────────────────────────────────────────────────┘
                    ↓
                 Both iterate all night
```

**Communication:**
- Daily: Reverude monitors Trello board, picks up new tasks
- Weekly: One summary message if there are decisions to discuss
- Code: GitHub PRs (Rose creates, Reverude reviews/approves)

---

## 🔧 Rose's Tasks

### Setup (One-time)
1. **Environment Variables** - Set TRELLO_API_KEY and TRELLO_TOKEN
2. **Trello Monitor** - Copy `/home/ubuntu/clawd/trello-monitor.sh` to `/root/`
3. **Run in background:** `nohup /home/ubuntu/clawd/trello-monitor.sh &`
4. **GitHub Clone** - Clone `https://github.com/anirudhprashant/gdpr-scanner.git`
5. **Deploy API** - Run `cd api && npm install && npm start`
6. **Install Dependencies** - `cd api && npm install express cors sqlite3`

### Development (Ongoing)
1. Pick up tasks from "📥 Incoming" list
2. Move to "⚡ In Progress" when starting work
3. Move to "✅ Completed" when done
4. Create GitHub PR for code changes

---

## 🔧 Reverude's Tasks

### Trello Monitoring (Ongoing)
- **Script:** `/home/ubuntu/clawd/trello-monitor.sh`
- **Runs:** Every 5 minutes via cron
- **Purpose:** Monitors Trello board, moves cards automatically

**What it does:**
- Checks "📥 Incoming" list for new cards
- Ignores "status" and "setup" cards
- Moves task to "⚡ In Progress"
- Adds 🟢 lime label
- Updates Rose via Trello webhook

---

## 📦 Next Steps

### Immediate (Today)
1. [ ] Rose clones GitHub repo
2. [ ] Rose installs Node dependencies
3. [ ] Rose deploys API server to production
4. [ ] Rose starts Trello monitor in background

### Phase 2 - Extension Packaging
1. [ ] Create Chrome extension icons (16x16, 48x48, 128x128)
2. [ ] Test extension locally
3. [ ] Package for Chrome Web Store
4. [ ] Submit to Chrome Web Store for review

### Phase 3 - Backend Enhancements
1. [ ] Add Stripe integration for checkout
2. [ ] Implement user authentication
3. [ ] Add webhook for Trello card movements
4. [ ] Deploy to production (Rose's server)

### Phase 4 - Marketing & Launch
1. [ ] Create landing page (gdprscanner.ai)
2. [ ] Write marketing copy
3. [ ] Launch on Product Hunt
4. [ ] Optimize Chrome Web Store listing

---

## 🌐 URLs

- **GitHub:** https://github.com/anirudhprashant/gdpr-scanner
- **Trello Board:** https://trello.com/b/qpM4FOE8/reverude-bot
- **Target URL:** https://gdprscanner.ai (future)

---

## 📊 Revenue Projection

| Tier | Price | Customers | MRR |
|-------|--------|----------|------|
| Free | £0 | Unlimited | 0 |
| Pro | £19/mo | 205 customers | **£8,895/mo (~$11K)** |
| Agency | £49/mo | 84 customers | **£12,336/mo (~$15K)** |

---

**Status: Code ready, Rose to deploy, Reverude monitoring Trello**
