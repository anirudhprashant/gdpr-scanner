// GDPR Scanner Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const scanBtn = document.getElementById('scan-btn');
  const scanAllBtn = document.getElementById('scan-all-btn');
  const exportBtn = document.getElementById('export-btn');
  const historyBtn = document.getElementById('history-btn');
  const upgradeBtn = document.getElementById('upgrade-btn');

  const resultsSection = document.getElementById('results');
  const scoreEl = document.getElementById('score');
  const violationsEl = document.getElementById('violations');
  const suggestionsEl = document.getElementById('suggestions');
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const errorMsgEl = document.getElementById('error-message');

  // Get API URL from storage (Rose server)
  chrome.storage.sync.get(['apiUrl'], (result) => {
    const apiUrl = result.apiUrl || 'http://localhost:3000/api';

    // Check if user has Pro plan
    chrome.storage.sync.get(['isPro'], (result) => {
      const isPro = result.isPro || false;
      if (isPro) {
        upgradeBtn.classList.add('hidden');
      }
    });

    // Scan current page
    scanBtn.addEventListener('click', async () => {
      await scanCurrentPage(apiUrl);
    });

    // Scan all links on page
    scanAllBtn.addEventListener('click', async () => {
      await scanAllLinks(apiUrl);
    });

    // Export report
    exportBtn.addEventListener('click', async () => {
      await exportReport();
    });

    // View history
    historyBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    });

    // Open settings
    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    });

    // Upgrade
    upgradeBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://gdprscanner.ai/upgrade' });
    });
  });

  async function scanCurrentPage(apiUrl) {
    showLoading(true);
    hideError();

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const results = await chrome.tabs.sendMessage(tab.id, { action: 'scan' });
      displayResults(results);
    } catch (error) {
      showError(error.message);
    } finally {
      showLoading(false);
    }
  }

  async function scanAllLinks(apiUrl) {
    showLoading(true);
    hideError();

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const results = await chrome.tabs.sendMessage(tab.id, { action: 'scanAll' });
      displayResults(results);
    } catch (error) {
      showError(error.message);
    } finally {
      showLoading(false);
    }
  }

  function displayResults(results) {
    hideLoading();
    resultsSection.classList.remove('hidden');

    // Save to history
    saveScanToHistory(results);

    const { score, violations, suggestions } = results;

    // Display score with color
    scoreEl.textContent = score;
    scoreEl.className = 'score ' + getScoreClass(score);

    // Display violations
    if (violations.length > 0) {
      violationsEl.innerHTML = `
        <h3>🔴 ${violations.length} Violations Found</h3>
        <ul class="violation-list">
          ${violations.map(v => `
            <li class="${v.severity}">
              <span class="severity">${v.severity}</span>
              ${v.description}
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      violationsEl.innerHTML = '<p class="success">✅ No violations found!</p>';
    }

    // Display suggestions
    if (suggestions.length > 0) {
      suggestionsEl.innerHTML = `
        <h3>💡 Recommendations</h3>
        <ul class="suggestion-list">
          ${suggestions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      `;
    } else {
      suggestionsEl.innerHTML = '';
    }
  }

  function getScoreClass(score) {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  async function exportReport() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Get current results or scan if needed
    let results;
    try {
      results = await chrome.tabs.sendMessage(tab.id, { action: 'getResults' });
    } catch (error) {
      // Need to scan first
      results = await chrome.tabs.sendMessage(tab.id, { action: 'scan' });
    }

    // Use background script for PDF export
    const response = await chrome.runtime.sendMessage({
      action: 'exportPDF',
      scanResult: results
    });

    if (!response.success) {
      // Fallback to text export
      const report = generateReport(results);
      downloadReport(report);
    }
  }

  function generateReport(results) {
    const date = new Date().toISOString();
    return `
GDPR Compliance Report
Generated: ${date}
Website: ${results.url}

COMPLIANCE SCORE: ${results.score}/100

VIOLATIONS:
${results.violations.map(v => `- ${v.description} (${v.severity})`).join('\n')}

RECOMMENDATIONS:
${results.suggestions.map(s => `- ${s}`).join('\n')}

Generated by GDPR Scanner Chrome Extension
https://gdprscanner.ai
    `;
  }

  function downloadReport(content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: `gdpr-report-${new Date().toISOString().split('T')[0]}.txt`,
      saveAs: true
    });
  }

  // Save scan to local storage history
  function saveScanToHistory(results) {
    chrome.storage.local.get(['scanHistory'], (data) => {
      const history = data.scanHistory || [];
      history.push({
        url: results.url,
        score: results.score,
        violations: results.violations,
        suggestions: results.suggestions,
        timestamp: results.timestamp || Date.now()
      });

      // Keep only last 100 scans
      if (history.length > 100) {
        history.shift();
      }

      chrome.storage.local.set({ scanHistory: history });
    });
  }

  function showLoading(show) {
    if (show) loadingEl.classList.remove('hidden');
    else loadingEl.classList.add('hidden');
  }

  function hideError() {
    errorEl.classList.add('hidden');
  }

  function showError(message) {
    hideError();
    errorMsgEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
});
