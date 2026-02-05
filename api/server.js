// GDPR Scanner Backend API
// Runs on Rose's server (24GB RAM, 4CPU ARM, 200GB SSD)

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuration
const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID || '69835f52d5fe74973120ccf5';
const TRELLO_INCOMING_LIST = process.env.TRELLO_INCOMING_LIST || '6983695dccd28357bfc17fdc';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Database
const dbPath = path.join(__dirname, 'gdpr-scanner.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database error:', err);
  } else {
    console.log('Connected to SQLite database');
    initDb();
  }
});

// Initialize database schema
function initDb() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        tier TEXT DEFAULT 'free',
        stripeCustomerId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Scans table
    db.run(`
      CREATE TABLE IF NOT EXISTS scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        url TEXT,
        score INTEGER,
        violations TEXT,
        suggestions TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Webhooks table (for Trello integration)
    db.run(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        secret TEXT,
        events TEXT DEFAULT 'all',
        active BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Scan endpoint (called by Chrome extension)
app.post('/api/scan', async (req, res) => {
  const { url, userId } = req.body;

  try {
    // For now, we scan client-side in extension
    // This endpoint just stores the results from the extension
    const scanId = await storeScan(userId, url, req.body);

    res.json({
      success: true,
      scanId,
      message: 'Scan results stored'
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get scan history for a user
app.get('/api/history', async (req, res) => {
  const { userId } = req.query;

  try {
    db.all('SELECT * FROM scans WHERE userId = ? ORDER BY createdAt DESC LIMIT 100', [userId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Parse violations and suggestions from JSON
      const scans = rows.map(row => ({
        ...row,
        violations: JSON.parse(row.violations || '[]'),
        suggestions: JSON.parse(row.suggestions || '[]')
      }));

      res.json({ scans });
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export scan report (Pro tier)
app.post('/api/export', async (req, res) => {
  const { scanId, userId } = req.body;

  try {
    db.get('SELECT * FROM scans WHERE id = ? AND userId = ?', [scanId, userId], (err, row) => {
      if (err || !row) {
        return res.status(404).json({ error: 'Scan not found' });
      }

      // Generate PDF report (simplified to text for now)
      const report = generateReport(row);

      res.json({
        success: true,
        report,
        downloadUrl: `/api/download/${scanId}`
      });
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe checkout (Pro tier)
app.post('/api/checkout', async (req, res) => {
  const { email, tier } = req.body; // 'pro' or 'agency'

  try {
    // Stripe integration placeholder
    // TODO: Add Stripe SDK and implement checkout

    // For now, upgrade user tier
    db.run(`
      UPDATE users SET tier = ? WHERE email = ?
    `, [tier, email], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        message: `Upgraded to ${tier} tier`,
        checkoutUrl: 'https://stripe.com/checkout-placeholder'
      });
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook for Trello integration
app.post('/api/trello-webhook', (req, res) => {
  const { action, cardId, cardName, listId } = req.body;

  console.log('Trello webhook received:', { action, cardId, cardName });

  try {
    switch (action) {
      case 'cardCreated':
      case 'cardMoved':
        // Process card movement
        handleCardAction(cardId, cardName, listId);
        break;
      default:
        console.log('Unknown action:', action);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trello monitoring (internal - called by cron job)
app.get('/api/trello-monitor', async (req, res) => {
  const { secret } = req.query;

  // Verify webhook secret
  db.get('SELECT * FROM webhooks WHERE secret = ? AND active = 1', [secret], (err, row) => {
    if (err || !row) {
      return res.status(401).json({ error: 'Invalid webhook' });
    }

    // Check Trello for new cards in Incoming list
    checkTrelloIncoming(row.url).then(cards => {
      res.json({
        success: true,
        webhook: row.url,
        cardsFound: cards.length,
        cards: cards
      });
    }).catch(error => {
      res.status(500).json({ error: error.message });
    });
  });
});

// Helper functions
function storeScan(userId, url, scanData) {
  return new Promise((resolve, reject) => {
    const { score, violations, suggestions } = scanData;

    db.run(`
      INSERT INTO scans (userId, url, score, violations, suggestions)
      VALUES (?, ?, ?, ?, ?)
    `, [
      userId,
      url,
      score || 0,
      JSON.stringify(violations || []),
      JSON.stringify(suggestions || [])
    ], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function handleCardAction(cardId, cardName, listId) {
  // This will be expanded to process Trello cards automatically
  console.log(`Card action: ${cardName} in list ${listId}`);
  // TODO: Move card between lists, add labels, etc.
}

async function checkTrelloIncoming(webhookUrl) {
  // Poll Trello for new cards in Incoming list (use env vars)
  const creds = getTrelloCredentials();
  if (!creds) {
    throw new Error('Trello credentials not configured');
  }

  const { apiKey, token } = creds;
  const boardId = TRELLO_BOARD_ID;
  const listId = TRELLO_INCOMING_LIST;

  const response = await fetch(`https://api.trello.com/1/lists/${listId}/cards?key=${apiKey}&token=${token}`);
  const cards = await response.json();

  return cards.map(card => ({
    id: card.id,
    name: card.name,
    url: card.shortUrl
  }));
}

function generateReport(scan) {
  return `
GDPR Compliance Report
======================
URL: ${scan.url}
Score: ${scan.score}/100
Scanned: ${new Date(scan.createdAt).toLocaleString()}

VIOLATIONS:
${JSON.parse(scan.violations).map(v => `- [${v.severity}] ${v.description}`).join('\n')}

RECOMMENDATIONS:
${JSON.parse(scan.suggestions).map(s => `- ${s}`).join('\n')}

Generated by GDPR Scanner
https://gdprscanner.ai
  `.trim();
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GDPR Scanner API running on port ${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🌐 Server ready for requests from Chrome extension`);
});
