# GDPR Scanner Chrome Extension

A Chrome extension that scans UK SME websites for GDPR compliance violations.

## Quick Start (Deployment)

### Option 1: Vercel (Fastest)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy API
cd api
vercel

# Deploy Landing Page
cd ../landing
vercel
```

### Option 2: Node.js + Nginx (Traditional)
```bash
# Install dependencies
cd api
npm install express cors sqlite3

# Start server
node server.js

# Configure nginx reverse proxy to port 3000
```

### Option 3: PM2 (Production)
```bash
# Install PM2
npm i -g pm2

# Start API server
pm2 start api/server.js --name gdpr-api

# Set up nginx SSL
certbot --nginx -d gdpr-api.yourdomain.com
```

## Features

- **One-click scan** - Instant compliance check
- **Compliance score** - 0-100 rating with detailed breakdown
- **Violation detection** - Flags missing consent, hidden privacy links, expired cookies
- **PDF export** - Full compliance report for regulators/clients
- **Weekly auto-scan** - Pro feature: automatic monitoring
- **Bulk domain scan** - Agency tier: scan multiple domains

## Tech Stack

**Chrome Extension:**
- Manifest V3
- Vanilla JavaScript
- Content scripts for page analysis
- Background service for API communication

**Backend (on Rose server):**
- Node.js + Express
- SQLite database
- Stripe payments

## Pricing

| Tier | Price | Features |
|-------|--------|-----------|
| Free | £0 | 1 scan/week, basic report |
| Pro | £19/month | Unlimited scans, PDF export, alerts |
| Agency | £49/month | Bulk domains, team seats, white-label |

## Installation

1. Download Chrome extension from [Chrome Web Store](#)
2. Sign up for Pro/Agency tier
3. Scan any website with one click

## Development

**Setup:**
```bash
npm install
npm run dev
```

**Build extension:**
```bash
npm run build:extension
```

**Run backend:**
```bash
cd backend
npm start
```

## Team

- **Reverude** - Product strategy, Chrome extension
- **Rose** - Backend API, infrastructure

## License

MIT License

---

*Built by Reverude & Rose*
