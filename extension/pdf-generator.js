// PDF Export Generator for GDPR Scanner
// Generates professional PDF compliance reports

class PDFReportGenerator {
  constructor() {
    this.pageSize = { width: 595, height: 842 }; // A4 size (points)
    this.margin = 50;
    this.contentWidth = this.pageSize.width - (this.margin * 2);
    this.yPosition = this.margin + 60; // Start after header
    this.pageHeight = this.pageSize.height;
    this.page = 1;
    this.pages = [[]];
    this.currentPageIndex = 0;
  }

  generateReport(scanResult) {
    this.scanResult = scanResult;
    
    // Header
    this.addHeader();
    
    // Executive Summary
    this.addSectionHeader('Executive Summary');
    this.addExecutiveSummary();
    
    // Compliance Score
    this.addSectionHeader('Compliance Score');
    this.addComplianceScore();
    
    // Violations Found
    if (scanResult.violations && scanResult.violations.length > 0) {
      this.addSectionHeader('Violations Found');
      this.addViolations(scanResult.violations);
    }
    
    // Recommendations
    if (scanResult.suggestions && scanResult.suggestions.length > 0) {
      this.addSectionHeader('Recommendations');
      this.addRecommendations(scanResult.suggestions);
    }
    
    // Statistics
    this.addSectionHeader('Scan Statistics');
    this.addStatistics(scanResult.stats);
    
    // Footer
    this.addFooter();
    
    return this.getPDFContent();
  }

  addHeader() {
    const date = new Date(this.scanResult.timestamp).toLocaleDateString();
    const time = new Date(this.scanResult.timestamp).toLocaleTimeString();
    
    const header = {
      type: 'header',
      title: 'GDPR Compliance Report',
      subtitle: `Generated on ${date} at ${time}`,
      url: this.scanResult.url
    };
    
    this.pages[this.currentPageIndex].push(header);
  }

  addSectionHeader(text) {
    this.pages[this.currentPageIndex].push({
      type: 'sectionHeader',
      text: text
    });
    this.yPosition += 30;
  }

  addExecutiveSummary() {
    const score = this.scanResult.score;
    let status = 'Non-Compliant';
    let statusColor = '#dc2626'; // red
    
    if (score >= 80) {
      status = 'Compliant';
      statusColor = '#16a34a'; // green
    } else if (score >= 60) {
      status = 'Partially Compliant';
      statusColor = '#f59e0b'; // orange
    }

    this.pages[this.currentPageIndex].push({
      type: 'executiveSummary',
      score: score,
      status: status,
      statusColor: statusColor
    });
  }

  addComplianceScore() {
    const score = this.scanResult.score;
    const violations = this.scanResult.violations || [];
    
    const high = violations.filter(v => v.severity === 'high').length;
    const medium = violations.filter(v => v.severity === 'medium').length;
    const low = violations.filter(v => v.severity === 'low').length;
    
    this.pages[this.currentPageIndex].push({
      type: 'complianceScore',
      score: score,
      high: high,
      medium: medium,
      low: low,
      totalViolations: violations.length
    });
  }

  addViolations(violations) {
    violations.forEach(v => {
      this.pages[this.currentPageIndex].push({
        type: 'violation',
        id: v.id,
        description: v.description,
        severity: v.severity,
        suggestion: v.suggestion
      });
      
      this.yPosition += 20;
      
      // Check if we need a new page
      if (this.yPosition > this.pageHeight - this.margin) {
        this.currentPageIndex++;
        this.pages[this.currentPageIndex] = [];
        this.yPosition = this.margin + 60;
      }
    });
  }

  addRecommendations(suggestions) {
    suggestions.forEach((suggestion, index) => {
      this.pages[this.currentPageIndex].push({
        type: 'recommendation',
        number: index + 1,
        text: suggestion
      });
      
      this.yPosition += 15;
    });
  }

  addStatistics(stats) {
    this.pages[this.currentPageIndex].push({
      type: 'statistics',
      url: this.scanResult.url,
      timestamp: new Date(this.scanResult.timestamp).toLocaleString(),
      totalCookies: stats?.totalCookies || 0,
      rulesChecked: stats?.rulesChecked || 17,
      scans: 1
    });
  }

  addFooter() {
    this.pages.forEach((page, index) => {
      page.push({
        type: 'footer',
        page: index + 1,
        total: this.pages.length,
        date: new Date().toLocaleDateString()
      });
    });
  }

  getPDFContent() {
    // Return a simplified representation for now
    // In production, use a PDF library like jsPDF or pdf-lib
    return {
      type: 'pdf-report',
      title: 'GDPR Compliance Report',
      url: this.scanResult.url,
      score: this.scanResult.score,
      violations: this.scanResult.violations,
      suggestions: this.scanResult.suggestions,
      generatedAt: new Date().toISOString()
    };
  }
}

// Export function for background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFReportGenerator;
}
