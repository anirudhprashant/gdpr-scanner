// GDPR Scanner Background Service Worker

let apiResults = null;

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('GDPR Scanner installed');
});

// Handle API URL configuration
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'configure') {
    // Save API URL from backend
    chrome.storage.sync.set({ apiUrl: request.apiUrl }, () => {
      sendResponse({ success: true });
    });
  } else if (request.action === 'getApiUrl') {
    chrome.storage.sync.get(['apiUrl'], (result) => {
      sendResponse({ apiUrl: result.apiUrl || 'http://localhost:3000/api' });
    });
  } else if (request.action === 'setPro') {
    // Upgrade to Pro tier
    chrome.storage.sync.set({ isPro: true, proTier: request.tier }, () => {
      sendResponse({ success: true });
    });
  } else if (request.action === 'exportPDF') {
    // Handle PDF export request
    exportPDF(request.scanResult).then(sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'saveScan') {
    // Save scan to backend
    saveScanToBackend(request.scanResult).then(sendResponse);
    return true;
  }
});

// API communication with Rose's backend
async function callBackend(endpoint, data) {
  const apiUrl = await getApiUrl();

  if (!apiUrl) {
    throw new Error('API not configured. Please configure.');
  }

  const response = await fetch(`${apiUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    'Authorization': `Bearer ${await getAuthToken()}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

async function getApiUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiUrl'], (result) => {
      resolve(result.apiUrl || 'http://localhost:3000/api');
    });
  });
}

async function getAuthToken() {
  // For now, return null (will add auth later)
  return null;
}

// Auto-scan on page load (Pro feature)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.startsWith('http')) {
    const settings = await getSettings();
    if (settings.autoScan) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            // Trigger scan via content script
            window.postMessage({ action: 'autoScan' });
          }
        });
      } catch (error) {
        console.log('Auto-scan error:', error);
      }
    }
  }
});

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['autoScan', 'isPro'], (result) => {
      resolve({
        autoScan: result.autoScan || false,
        isPro: result.isPro || false
      });
    });
  });
}

// PDF Export function
async function exportPDF(scanResult) {
  try {
    // For now, generate a simple HTML report that can be printed
    const reportUrl = generateHTMLReport(scanResult);
    
    // Open report in new tab for printing
    const tab = await chrome.tabs.create({ url: reportUrl });
    
    // Auto-trigger print dialog
    setTimeout(() => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.print()
      });
    }, 1000);
    
    return { success: true, message: 'PDF export initiated' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Generate HTML report for PDF export
function generateHTMLReport(scanResult) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>GDPR Compliance Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .score { font-size: 72px; font-weight: bold; text-align: center; margin: 30px 0; }
    .score.high { color: #16a34a; }
    .score.medium { color: #f59e0b; }
    .score.low { color: #dc2626; }
    .violation { background: #fee2e2; padding: 15px; margin: 10px 0; border-left: 4px solid #dc2626; }
    .violation.high { border-color: #dc2626; }
    .violation.medium { border-color: #f59e0b; }
    .violation.low { border-color: #6b7280; }
    .suggestion { background: #dcfce7; padding: 15px; margin: 10px 0; border-left: 4px solid #16a34a; }
    .stats { background: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>🔒 GDPR Compliance Report</h1>
  <p><strong>Website:</strong> ${scanResult.url}</p>
  <p><strong>Generated:</strong> ${new Date(scanResult.timestamp).toLocaleString()}</p>
  
  <div class="score ${scanResult.score >= 80 ? 'high' : scanResult.score >= 60 ? 'medium' : 'low'}">
    ${scanResult.score}/100
  </div>
  
  <h2>Compliance Status</h2>
  <p>${scanResult.score >= 80 ? '✅ Compliant' : scanResult.score >= 60 ? '⚠️ Partially Compliant' : '❌ Non-Compliant'}</p>
  
  ${scanResult.violations && scanResult.violations.length > 0 ? `
  <h2>Violations Found (${scanResult.violations.length})</h2>
  ${scanResult.violations.map(v => `
    <div class="violation ${v.severity}">
      <strong>${v.id}:</strong> ${v.description}<br>
      ${v.suggestion ? `<em>Recommendation: ${v.suggestion}</em>` : ''}
    </div>
  `).join('')}
  ` : ''}
  
  ${scanResult.suggestions && scanResult.suggestions.length > 0 ? `
  <h2>Recommendations</h2>
  ${scanResult.suggestions.map((s, i) => `
    <div class="suggestion">
      <strong>${i + 1}.</strong> ${s}
    </div>
  `).join('')}
  ` : ''}
  
  ${scanResult.stats ? `
  <div class="stats">
    <h3>Scan Statistics</h3>
    <p><strong>Total Cookies:</strong> ${scanResult.stats.totalCookies}</p>
    <p><strong>Rules Checked:</strong> ${scanResult.stats.rulesChecked}</p>
  </div>
  ` : ''}
  
  <p style="color: #999; text-align: center; margin-top: 50px;">
    Generated by GDPR Scanner Chrome Extension
  </p>
</body>
</html>
  `;
  
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}

// Save scan to backend
async function saveScanToBackend(scanResult) {
  try {
    const apiUrl = await getApiUrl();
    
    const response = await fetch(`${apiUrl}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scanResult)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save scan');
    }
    
    return { success: true, message: 'Scan saved successfully' };
  } catch (error) {
    console.log('Backend save failed:', error);
    return { success: false, error: error.message };
  }
}
