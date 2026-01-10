/**
 * Health Dashboard System
 * Tracks codebase health metrics over time
 */

// ============================================================================
// Types
// ============================================================================

export interface HealthMetric {
  score: number // 0-100
  status: 'good' | 'warning' | 'critical'
  lastChecked: Date | null
  issues: string[]
  trend: 'up' | 'down' | 'stable'
}

export interface HealthReport {
  overall: HealthMetric
  security: HealthMetric
  coverage: HealthMetric
  dependencies: HealthMetric
  techDebt: HealthMetric
  performance: HealthMetric
  lastFullScan: Date | null
  scanHistory: ScanResult[]
}

export interface ScanResult {
  date: Date
  type: 'security' | 'coverage' | 'dependencies' | 'techDebt' | 'performance' | 'full'
  overallScore: number
  findings: number
}

// ============================================================================
// Constants
// ============================================================================

const HEALTH_STORAGE_KEY = 'nexteleven_healthReport'
const MAX_HISTORY = 30

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_METRIC: HealthMetric = {
  score: 0,
  status: 'warning',
  lastChecked: null,
  issues: [],
  trend: 'stable',
}

const DEFAULT_REPORT: HealthReport = {
  overall: { ...DEFAULT_METRIC },
  security: { ...DEFAULT_METRIC },
  coverage: { ...DEFAULT_METRIC },
  dependencies: { ...DEFAULT_METRIC },
  techDebt: { ...DEFAULT_METRIC },
  performance: { ...DEFAULT_METRIC },
  lastFullScan: null,
  scanHistory: [],
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatus(score: number): HealthMetric['status'] {
  if (score >= 80) return 'good'
  if (score >= 50) return 'warning'
  return 'critical'
}

function getStatusEmoji(status: HealthMetric['status']): string {
  switch (status) {
    case 'good': return '🟢'
    case 'warning': return '🟡'
    case 'critical': return '🔴'
  }
}

function getTrendEmoji(trend: HealthMetric['trend']): string {
  switch (trend) {
    case 'up': return '↑'
    case 'down': return '↓'
    case 'stable': return '→'
  }
}

function calculateTrend(history: ScanResult[], currentScore: number): HealthMetric['trend'] {
  if (history.length < 2) return 'stable'
  
  const recentScores = history.slice(-5).map(h => h.overallScore)
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
  
  if (currentScore > avgRecent + 5) return 'up'
  if (currentScore < avgRecent - 5) return 'down'
  return 'stable'
}

// ============================================================================
// Storage Functions
// ============================================================================

export function loadHealthReport(): HealthReport {
  if (typeof window === 'undefined') return DEFAULT_REPORT
  
  try {
    const stored = localStorage.getItem(HEALTH_STORAGE_KEY)
    if (!stored) return DEFAULT_REPORT
    
    const parsed = JSON.parse(stored)
    
    // Convert date strings back to Date objects
    return {
      ...parsed,
      overall: { ...parsed.overall, lastChecked: parsed.overall.lastChecked ? new Date(parsed.overall.lastChecked) : null },
      security: { ...parsed.security, lastChecked: parsed.security.lastChecked ? new Date(parsed.security.lastChecked) : null },
      coverage: { ...parsed.coverage, lastChecked: parsed.coverage.lastChecked ? new Date(parsed.coverage.lastChecked) : null },
      dependencies: { ...parsed.dependencies, lastChecked: parsed.dependencies.lastChecked ? new Date(parsed.dependencies.lastChecked) : null },
      techDebt: { ...parsed.techDebt, lastChecked: parsed.techDebt.lastChecked ? new Date(parsed.techDebt.lastChecked) : null },
      performance: { ...parsed.performance, lastChecked: parsed.performance.lastChecked ? new Date(parsed.performance.lastChecked) : null },
      lastFullScan: parsed.lastFullScan ? new Date(parsed.lastFullScan) : null,
      scanHistory: parsed.scanHistory.map((s: ScanResult) => ({ ...s, date: new Date(s.date) })),
    }
  } catch {
    return DEFAULT_REPORT
  }
}

export function saveHealthReport(report: HealthReport): void {
  if (typeof window === 'undefined') return
  
  // Limit history
  const limitedReport = {
    ...report,
    scanHistory: report.scanHistory.slice(-MAX_HISTORY),
  }
  
  localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(limitedReport))
}

// ============================================================================
// Update Functions
// ============================================================================

export function updateMetric(
  metricType: keyof Omit<HealthReport, 'overall' | 'lastFullScan' | 'scanHistory'>,
  score: number,
  issues: string[] = []
): HealthReport {
  const report = loadHealthReport()
  const now = new Date()
  
  report[metricType] = {
    score,
    status: getStatus(score),
    lastChecked: now,
    issues,
    trend: calculateTrend(report.scanHistory, score),
  }
  
  // Recalculate overall
  const metrics = [report.security, report.coverage, report.dependencies, report.techDebt, report.performance]
  const validMetrics = metrics.filter(m => m.lastChecked !== null)
  
  if (validMetrics.length > 0) {
    const avgScore = validMetrics.reduce((sum, m) => sum + m.score, 0) / validMetrics.length
    report.overall = {
      score: Math.round(avgScore),
      status: getStatus(avgScore),
      lastChecked: now,
      issues: validMetrics.flatMap(m => m.issues).slice(0, 5),
      trend: calculateTrend(report.scanHistory, avgScore),
    }
  }
  
  // Add to history
  report.scanHistory.push({
    date: now,
    type: metricType,
    overallScore: report.overall.score,
    findings: issues.length,
  })
  
  saveHealthReport(report)
  return report
}

export function recordFullScan(scores: {
  security: number
  coverage: number
  dependencies: number
  techDebt: number
  performance: number
}, issues: Record<string, string[]> = {}): HealthReport {
  const report = loadHealthReport()
  const now = new Date()
  
  // Update each metric
  const metricTypes: Array<keyof typeof scores> = ['security', 'coverage', 'dependencies', 'techDebt', 'performance']
  
  for (const type of metricTypes) {
    report[type] = {
      score: scores[type],
      status: getStatus(scores[type]),
      lastChecked: now,
      issues: issues[type] || [],
      trend: calculateTrend(report.scanHistory, scores[type]),
    }
  }
  
  // Calculate overall
  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / 5
  report.overall = {
    score: Math.round(avgScore),
    status: getStatus(avgScore),
    lastChecked: now,
    issues: Object.values(issues).flat().slice(0, 5),
    trend: calculateTrend(report.scanHistory, avgScore),
  }
  
  report.lastFullScan = now
  
  // Add to history
  report.scanHistory.push({
    date: now,
    type: 'full',
    overallScore: report.overall.score,
    findings: Object.values(issues).flat().length,
  })
  
  saveHealthReport(report)
  return report
}

// ============================================================================
// Format Functions
// ============================================================================

export function formatHealthSummary(report: HealthReport): string {
  const { overall } = report
  
  if (!overall.lastChecked) {
    return 'No scans yet'
  }
  
  return `${getStatusEmoji(overall.status)} ${overall.score}/100 ${getTrendEmoji(overall.trend)}`
}

export function formatMetricDisplay(metric: HealthMetric, name: string): string {
  if (!metric.lastChecked) {
    return `${name}: Not scanned`
  }
  
  return `${getStatusEmoji(metric.status)} ${name}: ${metric.score}/100 ${getTrendEmoji(metric.trend)}`
}

export function formatDetailedReport(report: HealthReport): string {
  const lines = [
    '## 📊 Health Dashboard',
    '',
    `**Overall: ${formatHealthSummary(report)}**`,
    '',
    '### Metrics',
    formatMetricDisplay(report.security, '🔒 Security'),
    formatMetricDisplay(report.coverage, '🧪 Coverage'),
    formatMetricDisplay(report.dependencies, '📦 Dependencies'),
    formatMetricDisplay(report.techDebt, '⚠️ Tech Debt'),
    formatMetricDisplay(report.performance, '⚡ Performance'),
  ]
  
  if (report.overall.issues.length > 0) {
    lines.push('', '### Top Issues')
    report.overall.issues.forEach(issue => {
      lines.push(`- ${issue}`)
    })
  }
  
  if (report.lastFullScan) {
    const ago = formatTimeAgo(report.lastFullScan)
    lines.push('', `_Last full scan: ${ago}_`)
  }
  
  return lines.join('\n')
}

export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ============================================================================
// Scan Prompts
// ============================================================================

export function getSecurityScanPrompt(): string {
  return `/agent security Perform a security audit of this codebase. After your analysis, rate the security on a scale of 0-100 and list the top issues found. Format your final assessment as:

SECURITY_SCORE: [number]
ISSUES:
- [issue 1]
- [issue 2]
...`
}

export function getCoverageScanPrompt(): string {
  return `/agent testing Analyze the test coverage of this codebase. Check for untested files, missing edge cases, and test quality. Rate the coverage on a scale of 0-100. Format your final assessment as:

COVERAGE_SCORE: [number]
ISSUES:
- [issue 1]
- [issue 2]
...`
}

export function getDependencyScanPrompt(): string {
  return `/agent dependency Audit the dependencies in this project. Check for outdated packages, security vulnerabilities, and unused dependencies. Rate the dependency health on a scale of 0-100. Format your final assessment as:

DEPENDENCY_SCORE: [number]
ISSUES:
- [issue 1]
- [issue 2]
...`
}

export function getTechDebtScanPrompt(): string {
  return `/agent codeReview Analyze this codebase for technical debt. Look for code smells, TODOs, complex functions, and areas needing refactoring. Rate the tech debt level on a scale of 0-100 (100 = no debt). Format your final assessment as:

TECHDEBT_SCORE: [number]
ISSUES:
- [issue 1]
- [issue 2]
...`
}

export function getPerformanceScanPrompt(): string {
  return `/agent performance Analyze this codebase for performance issues. Check for bottlenecks, memory leaks, inefficient algorithms, and optimization opportunities. Rate the performance on a scale of 0-100. Format your final assessment as:

PERFORMANCE_SCORE: [number]
ISSUES:
- [issue 1]
- [issue 2]
...`
}

export function getFullScanPrompt(): string {
  return `/agent swarm Run a comprehensive health audit of this codebase covering:
1. Security vulnerabilities
2. Test coverage
3. Dependency health
4. Technical debt
5. Performance

For each category, provide a score from 0-100 and list top issues. Format your final assessment as:

HEALTH_REPORT:
SECURITY_SCORE: [number]
COVERAGE_SCORE: [number]
DEPENDENCY_SCORE: [number]
TECHDEBT_SCORE: [number]
PERFORMANCE_SCORE: [number]

TOP_ISSUES:
- [issue 1]
- [issue 2]
...`
}

// ============================================================================
// Export Utilities
// ============================================================================

export const healthDashboard = {
  load: loadHealthReport,
  save: saveHealthReport,
  updateMetric,
  recordFullScan,
  formatSummary: formatHealthSummary,
  formatDetailed: formatDetailedReport,
  prompts: {
    security: getSecurityScanPrompt,
    coverage: getCoverageScanPrompt,
    dependencies: getDependencyScanPrompt,
    techDebt: getTechDebtScanPrompt,
    performance: getPerformanceScanPrompt,
    full: getFullScanPrompt,
  },
}
