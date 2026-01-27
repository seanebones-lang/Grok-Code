/**
 * Lighthouse CI Configuration
 * Runs Lighthouse audits and generates performance reports
 */

module.exports = {
  ci: {
    collect: {
      // Number of runs per URL
      numberOfRuns: 3,
      // Start local server if needed
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 60000,
      // URLs to audit
      url: [
        'http://localhost:3000',
      ],
      // Settings
      settings: {
        // Throttling
        throttling: {
          rttMs: 40,
          throughputKbps: 10 * 1024,
          cpuSlowdownMultiplier: 1,
        },
        // Screen emulation
        screenEmulation: {
          width: 412,
          height: 732,
          deviceScaleFactor: 2.625,
        },
        // Skip certain audits if needed
        skipAudits: [],
      },
    },
    assert: {
      // Performance budgets
      assertions: {
        'categories:performance': ['error', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        // Performance metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
      },
    },
    upload: {
      // Upload results to temporary public storage
      target: 'temporary-public-storage',
    },
  },
}
