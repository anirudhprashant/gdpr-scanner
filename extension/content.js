// GDPR Scanner Content Script
// Analyzes page content for GDPR compliance violations

(function() {
  'use strict';

  const GDPR_RULES = {
    // Cookie consent requirements
    cookieConsent: {
      id: 'cookie-consent',
      description: 'Cookie consent banner missing or not compliant',
      severity: 'high',
      check: () => {
        // Check for cookie banner
        const cookieBanners = document.querySelectorAll(
          '[class*="cookie"], [id*="cookie"], [aria-label*="cookie"], ' +
          '[class*="consent"], [id*="consent"]'
        );

        if (cookieBanners.length === 0) {
          return { issue: 'No cookie consent banner found' };
        }

        // Check if banner has proper options (reject all, accept necessary only)
        let hasRejectAll = false;
        let hasAcceptNecessary = false;

        cookieBanners.forEach(banner => {
          const text = banner.textContent.toLowerCase();
          if (text.includes('reject') || text.includes('reject all')) {
            hasRejectAll = true;
          }
          if (text.includes('necessary') || text.includes('essential only')) {
            hasAcceptNecessary = true;
          }
        });

        if (!hasRejectAll || !hasAcceptNecessary) {
          return {
            issue: 'Cookie banner missing "Reject All" or "Necessary Only" options'
          };
        }

        return null;
      }
    },

    // Cookie wall detection (illegal under GDPR)
    cookieWall: {
      id: 'cookie-wall',
      description: 'Cookie wall detected (blocks access without consent)',
      severity: 'high',
      check: () => {
        const bodyText = document.body.textContent.toLowerCase();
        
        // Check for cookie wall language
        const cookieWallPhrases = [
          'you must accept cookies to continue',
          'cookies are required to access this site',
          'accept cookies to proceed',
          'please accept cookies to continue'
        ];
        
        for (const phrase of cookieWallPhrases) {
          if (bodyText.includes(phrase)) {
            return { 
              issue: 'Cookie wall detected - illegal under GDPR',
              suggestion: 'Cookie walls violate GDPR. Consent must be freely given.'
            };
          }
        }

        return null;
      }
    },

    // Cookie duration
    cookieDuration: {
      id: 'cookie-duration',
      description: 'Cookies stored for longer than necessary',
      severity: 'medium',
      check: () => {
        // Check for long-lived cookies in page
        const cookies = document.cookie.split(';');
        const longLivedCookies = cookies.filter(cookie => {
          const maxAgeMatch = cookie.match(/max-age=(\d+)/i);
          if (maxAgeMatch) {
            const maxAge = parseInt(maxAgeMatch[1]);
            // GDPR: cookies for analytics/marketing should expire in 13 months
            return maxAge > 394; // 13 months * 30 days
          }
          const expiresMatch = cookie.match(/expires=([^;]+)/i);
          if (expiresMatch) {
            const expiresDate = new Date(expiresMatch[1]);
            const maxExpiry = new Date();
            maxExpiry.setMonth(maxExpiry.getMonth() + 13);
            return expiresDate > maxExpiry;
          }
          return false;
        });

        if (longLivedCookies.length > 0) {
          return {
            issue: `Found ${longLivedCookies.length} long-lived cookies`,
            suggestion: 'Reduce cookie lifetime to 13 months maximum'
          };
        }

        return null;
      }
    },

    // Third-party cookie detection
    thirdPartyCookies: {
      id: 'third-party-cookies',
      description: 'Third-party cookies detected without proper consent',
      severity: 'medium',
      check: () => {
        const cookies = document.cookie.split(';').map(c => c.trim().toLowerCase());
        const knownThirdPartyPatterns = ['_ga', '_gid', 'fbp', 'fbc', 'tr', '_fbp', '_gcl'];
        const thirdPartyCookies = cookies.filter(c => 
          knownThirdPartyPatterns.some(p => c.includes(p))
        );

        if (thirdPartyCookies.length > 0) {
          return {
            issue: `Found ${thirdPartyCookies.length} third-party tracking cookies`,
            cookies: thirdPartyCookies,
            suggestion: 'Third-party cookies require explicit, informed consent'
          };
        }

        return null;
      }
    },

    // Privacy policy link visibility
    privacyLink: {
      id: 'privacy-link',
      description: 'Privacy policy link missing or hard to find',
      severity: 'high',
      check: () => {
        // Check for privacy policy link in footer
        const footer = document.querySelector('footer');
        if (!footer) {
          return { issue: 'No footer found (privacy policy likely missing)' };
        }

        const footerText = footer.textContent.toLowerCase();
        const hasPrivacy = footerText.includes('privacy');
        const links = footer.querySelectorAll('a');
        let privacyLink = null;

        links.forEach(link => {
          const href = link.getAttribute('href') || '';
          const text = link.textContent.toLowerCase();
          if (text.includes('privacy') || href.includes('privacy')) {
            privacyLink = link;
          }
        });

        if (!privacyLink) {
          return { issue: 'Privacy policy link not found in footer' };
        }

        // Check if link is visible (not hidden)
        const style = window.getComputedStyle(privacyLink);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return { issue: 'Privacy policy link is hidden' };
        }

        return null;
      }
    },

    // Cookie consent storage
    consentStorage: {
      id: 'consent-storage',
      description: 'Cookie consent not stored/retrievable',
      severity: 'high',
      check: () => {
        // Check localStorage for consent
        try {
          const consentKey = Object.keys(localStorage).find(key =>
            key.includes('consent') || key.includes('cookie') || key.includes('gdpr')
          );

          if (!consentKey) {
            return { issue: 'No consent found in localStorage' };
          }

          const consent = JSON.parse(localStorage[consentKey]);

          if (!consent || !consent.timestamp || !consent.accepted) {
            return { issue: 'Consent not properly stored' };
          }

          // Check if consent is expired (GDPR: consent valid for reasonable period)
          const consentDate = new Date(consent.timestamp);
          const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
          if (Date.now() - consentDate.getTime() > maxAge) {
            return { issue: 'Consent stored is expired (>1 year)' };
          }

          return null;
        } catch (e) {
          return { issue: 'Consent storage not accessible or corrupted' };
        }
      }
    },

    // Data subject rights
    dataSubjectRights: {
      id: 'data-subject-rights',
      description: 'No "right to be forgotten" or data export mechanism',
      severity: 'medium',
      check: () => {
        const footer = document.querySelector('footer');
        if (!footer) {
          return { issue: 'Cannot check data rights (no footer)' };
        }

        const footerText = footer.textContent.toLowerCase();
        const hasDeleteData = footerText.includes('delete') || footerText.includes('forget');
        const hasExportData = footerText.includes('export') || footerText.includes('download');
        const hasAccessData = footerText.includes('access') || footerText.includes('request');

        if (!hasDeleteData || !hasExportData) {
          return {
            issue: 'Missing data deletion/export options',
            suggestion: 'Add "Data Deletion Request" or "Download My Data" link'
          };
        }

        return null;
      }
    },

    // Right to access (Article 15)
    rightToAccess: {
      id: 'right-to-access',
      description: 'No mechanism for users to request access to their data',
      severity: 'medium',
      check: () => {
        const bodyText = document.body.textContent.toLowerCase();
        const hasAccess = bodyText.includes('access my data') ||
                          bodyText.includes('request my data') ||
                          bodyText.includes('data subject access request') ||
                          bodyText.includes('dsar');

        if (!hasAccess) {
          return {
            issue: 'No mechanism for data access requests found',
            suggestion: 'Add "Request My Data" form or email contact'
          };
        }

        return null;
      }
    },

    // Right to portability (Article 20)
    rightToPortability: {
      id: 'right-to-portability',
      description: 'No mention of right to data portability',
      severity: 'low',
      check: () => {
        const bodyText = document.body.textContent.toLowerCase();
        const hasPortability = bodyText.includes('portability') ||
                               bodyText.includes('portable') ||
                               bodyText.includes('export my data');

        if (!hasPortability) {
          return {
            issue: 'Right to data portability not mentioned',
            suggestion: 'Inform users of their right to receive their data in portable format'
          };
        }

        return null;
      }
    },

    // International transfers
    internationalTransfer: {
      id: 'international-transfer',
      description: 'No mention of international data transfer rights',
      severity: 'low',
      check: () => {
        const bodyText = document.body.textContent.toLowerCase();
        const hasTransfer = bodyText.includes('transfer') || bodyText.includes('international');

        if (!hasTransfer) {
          return {
            issue: 'No mention of international data transfer rights',
            suggestion: 'Add "Your data may be transferred internationally" to privacy policy'
          };
        }

        return null;
      }
    },

    // Cookie categories
    cookieCategories: {
      id: 'cookie-categories',
      description: 'Cookies not categorized (necessary, analytics, marketing)',
      severity: 'medium',
      check: () => {
        // Check for cookie policy page
        const links = document.querySelectorAll('a[href*="cookie"], a[href*="policy"]');
        let cookiePolicy = null;

        links.forEach(link => {
          const href = link.getAttribute('href');
          const text = link.textContent.toLowerCase();
          if (text.includes('cookie') || href.includes('cookie')) {
            cookiePolicy = link;
          }
        });

        if (!cookiePolicy) {
          return {
            issue: 'No cookie policy found',
            suggestion: 'Create a cookie policy page categorizing cookies'
          };
        }

        // Check if banner mentions cookie categories
        const bannerText = document.body.textContent.toLowerCase();
        const hasCategories = bannerText.includes('necessary') || 
                              bannerText.includes('analytics') || 
                              bannerText.includes('marketing') ||
                              bannerText.includes('functional');

        if (!hasCategories) {
          return {
            issue: 'Cookies not properly categorized',
            suggestion: 'Categorize cookies into: necessary, analytics, marketing, functional'
          };
        }

        return null;
      }
    },

    // DPO (Data Protection Officer) contact
    dpoContact: {
      id: 'dpo-contact',
      description: 'No Data Protection Officer contact information',
      severity: 'medium',
      check: () => {
        const footer = document.querySelector('footer');
        if (!footer) {
          return { issue: 'Cannot check DPO contact (no footer)' };
        }

        const footerText = footer.textContent.toLowerCase();
        const hasDPO = footerText.includes('dpo') ||
                       footerText.includes('data protection') ||
                       footerText.includes('protection officer') ||
                       footerText.includes('privacy officer');

        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const hasEmail = emailPattern.test(footerText);

        if (!hasDPO && !hasEmail) {
          return {
            issue: 'No DPO contact information found',
            suggestion: 'Add Data Protection Officer email or contact form'
          };
        }

        return null;
      }
    },

    // Data retention period
    dataRetention: {
      id: 'data-retention',
      description: 'No mention of data retention period',
      severity: 'low',
      check: () => {
        const bodyText = document.body.textContent.toLowerCase();
        const hasRetention = bodyText.includes('retention') ||
                             bodyText.includes('how long') ||
                             bodyText.includes('keep data') ||
                             bodyText.includes('store data');

        if (!hasRetention) {
          return {
            issue: 'No mention of data retention period',
            suggestion: 'State how long you retain personal data and the criteria used'
          };
        }

        return null;
      }
    },

    // Legal basis for processing
    legalBasis: {
      id: 'legal-basis',
      description: 'No mention of legal basis for data processing',
      severity: 'medium',
      check: () => {
        const bodyText = document.body.textContent.toLowerCase();
        const hasLegalBasis = bodyText.includes('legal basis') ||
                             bodyText.includes('lawful basis') ||
                             bodyText.includes('consent as legal') ||
                             bodyText.includes('legitimate interest');

        if (!hasLegalBasis) {
          return {
            issue: 'No mention of legal basis for processing',
            suggestion: 'State legal basis for processing (consent, legitimate interest, contract, legal obligation)'
          };
        }

        return null;
      }
    },

    // Double opt-in check
    doubleOptIn: {
      id: 'double-opt-in',
      description: 'No double opt-in for email subscriptions',
      severity: 'low',
      check: () => {
        const forms = document.querySelectorAll('form');
        let hasEmailForm = false;

        forms.forEach(form => {
          const inputs = form.querySelectorAll('input[type="email"]');
          if (inputs.length > 0) {
            hasEmailForm = true;
          }
        });

        if (hasEmailForm) {
          const bodyText = document.body.textContent.toLowerCase();
          const hasDoubleOptIn = bodyText.includes('confirm') || 
                                 bodyText.includes('verify email') ||
                                 bodyText.includes('double opt');

          if (!hasDoubleOptIn) {
            return {
              issue: 'Email form may lack double opt-in verification',
              suggestion: 'Implement double opt-in for email marketing subscriptions'
            };
          }
        }

        return null;
      }
    },

    // Cookie policy link in cookie banner
    cookiePolicyLink: {
      id: 'cookie-policy-link',
      description: 'Cookie policy link not in consent banner',
      severity: 'medium',
      check: () => {
        const cookieBanners = document.querySelectorAll(
          '[class*="cookie"], [id*="cookie"], [aria-label*="cookie"], ' +
          '[class*="consent"], [id*="consent"]'
        );

        if (cookieBanners.length === 0) {
          return null; // Already caught by cookieConsent check
        }

        let hasPolicyLink = false;
        cookieBanners.forEach(banner => {
          const links = banner.querySelectorAll('a');
          links.forEach(link => {
            const href = link.getAttribute('href') || '';
            const text = link.textContent.toLowerCase();
            if (text.includes('policy') || href.includes('policy') ||
                text.includes('more information') || text.includes('learn more')) {
              hasPolicyLink = true;
            }
          });
        });

        if (!hasPolicyLink) {
          return {
            issue: 'Cookie banner lacks link to cookie policy',
            suggestion: 'Add "Cookie Policy" link to consent banner'
          };
        }

        return null;
      }
    }
  };

  // Main scan function
  function scanPage() {
    const violations = [];
    const suggestions = [];

    // Run all GDPR checks
    Object.values(GDPR_RULES).forEach(rule => {
      const result = rule.check();
      if (result) {
        violations.push({
          id: rule.id,
          description: result.issue,
          severity: rule.severity,
          suggestion: result.suggestion
        });

        if (result.suggestion) {
          suggestions.push(result.suggestion);
        }
      }
    });

    // Calculate compliance score
    const score = calculateScore(violations);

    // Count cookies for stats
    const totalCookies = document.cookie ? document.cookie.split(';').filter(c => c.trim()).length : 0;

    return {
      violations,
      suggestions,
      score,
      url: window.location.href,
      timestamp: Date.now(),
      stats: {
        totalCookies,
        rulesChecked: Object.keys(GDPR_RULES).length
      }
    };
  }

  function calculateScore(violations) {
    // Start with 100, deduct points for violations
    let score = 100;

    violations.forEach(v => {
      switch (v.severity) {
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  // Listen for scan requests from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scan' || request.action === 'scanAll') {
      const results = scanPage();
      sendResponse(results);
    } else if (request.action === 'getResults') {
      const results = scanPage();
      sendResponse(results);
    }
  });
})();
