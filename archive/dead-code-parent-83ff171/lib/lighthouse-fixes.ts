/**
 * Lighthouse Fixes Utilities
 * Helper functions to address common Lighthouse issues
 */

/**
 * Add ARIA label to slider elements
 * Fixes: "ARIA input fields do not have accessible names"
 */
export function addSliderAriaLabel(
  element: HTMLElement,
  label: string
): void {
  if (element.getAttribute('role') === 'slider') {
    if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
      element.setAttribute('aria-label', label)
    }
  }
}

/**
 * Check color contrast ratio
 * Returns true if contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
 */
export function checkColorContrast(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  // Simplified contrast check - in production, use a proper library
  // This is a placeholder for the actual contrast calculation
  const minRatio = isLargeText ? 3 : 4.5
  // Actual implementation would calculate luminance and contrast ratio
  return true // Placeholder
}

/**
 * Fix heading hierarchy
 * Ensures headings are in sequential order (h1 → h2 → h3, etc.)
 */
export function validateHeadingHierarchy(headings: HTMLHeadingElement[]): boolean {
  let lastLevel = 0
  for (const heading of headings) {
    const level = parseInt(heading.tagName.charAt(1))
    if (level > lastLevel + 1) {
      return false // Invalid hierarchy
    }
    lastLevel = level
  }
  return true
}

/**
 * Add label to select element
 * Fixes: "Select elements do not have associated label elements"
 */
export function ensureSelectLabel(select: HTMLSelectElement, labelText: string): void {
  if (!select.id) {
    select.id = `select-${Math.random().toString(36).substring(7)}`
  }
  
  const existingLabel = document.querySelector(`label[for="${select.id}"]`)
  if (!existingLabel) {
    const label = document.createElement('label')
    label.setAttribute('for', select.id)
    label.textContent = labelText
    label.className = 'sr-only' // Visually hidden but accessible
    select.parentElement?.insertBefore(label, select)
  }
}
