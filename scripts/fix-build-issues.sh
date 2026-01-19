#!/bin/bash

# Fix build issues for Vercel deployment
# Addresses: prerendering errors, viewport metadata, husky, npm vulnerabilities

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔧 Fixing Vercel Build Issues..."
echo "=================================="
echo ""

# 1. Fix husky in package.json (make it optional)
echo "1️⃣  Fixing husky prepare script..."
if grep -q '"prepare": "husky install"' package.json; then
  # Replace with optional version
  sed -i.bak 's/"prepare": "husky install"/"prepare": "husky install || true"/' package.json
  echo "  ✅ Updated husky to be optional"
elif ! grep -q '"prepare"' package.json; then
  # Add optional prepare script
  sed -i.bak '/"postinstall":/a\
    "prepare": "prisma generate || true",' package.json
  echo "  ✅ Added optional prepare script"
else
  echo "  ✅ Husky already configured correctly"
fi

# 2. Create cookies page if missing
echo ""
echo "2️⃣  Checking cookies page..."
if [ ! -f "src/app/cookies/page.tsx" ]; then
  echo "  📝 Creating cookies page..."
  mkdir -p src/app/cookies
  cat > src/app/cookies/page.tsx << 'EOF'
'use client'

import { useEffect, useState } from 'react'

export default function CookiesPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Cookie Policy</h1>
      <div className="prose prose-invert max-w-none">
        <p className="text-lg mb-4">
          This website uses cookies to enhance your experience and provide personalized content.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">What are cookies?</h2>
        <p className="mb-4">
          Cookies are small text files that are placed on your device when you visit our website.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">How we use cookies</h2>
        <ul className="list-disc list-inside mb-4 space-y-2">
          <li>To remember your preferences</li>
          <li>To analyze website traffic</li>
          <li>To provide personalized content</li>
        </ul>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Managing cookies</h2>
        <p className="mb-4">
          You can control and manage cookies through your browser settings.
        </p>
      </div>
    </div>
  )
}
EOF
  echo "  ✅ Created cookies page"
else
  echo "  ✅ Cookies page already exists"
fi

# 3. Create newsletters page if missing
echo ""
echo "3️⃣  Checking newsletters page..."
if [ ! -f "src/app/newsletters/page.tsx" ]; then
  echo "  📝 Creating newsletters page..."
  mkdir -p src/app/newsletters
  cat > src/app/newsletters/page.tsx << 'EOF'
'use client'

import { useEffect, useState } from 'react'

export default function NewslettersPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Newsletters</h1>
      <div className="prose prose-invert max-w-none">
        <p className="text-lg mb-4">
          Subscribe to our newsletter to stay updated with the latest news and updates.
        </p>
        <div className="mt-8">
          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="your@email.com"
                required
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
EOF
  echo "  ✅ Created newsletters page"
else
  echo "  ✅ Newsletters page already exists"
fi

# 4. Create layouts to force dynamic rendering
echo ""
echo "4️⃣  Creating layouts for dynamic rendering..."
if [ ! -f "src/app/cookies/layout.tsx" ]; then
  cat > src/app/cookies/layout.tsx << 'EOF'
// Force dynamic rendering for cookies page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
EOF
  echo "  ✅ Created cookies layout"
fi

if [ ! -f "src/app/newsletters/layout.tsx" ]; then
  cat > src/app/newsletters/layout.tsx << 'EOF'
// Force dynamic rendering for newsletters page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function NewslettersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
EOF
  echo "  ✅ Created newsletters layout"
fi

# 5. Check for viewport in metadata (warn if found)
echo ""
echo "5️⃣  Checking for viewport metadata issues..."
if grep -r "viewport.*metadata\|metadata.*viewport" src/app --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "export const viewport"; then
  echo "  ⚠️  Found viewport in metadata exports - check BUILD_FIXES.md for fix"
else
  echo "  ✅ No viewport metadata issues found"
fi

# 6. Run npm audit fix (non-breaking)
echo ""
echo "6️⃣  Running npm audit fix..."
npm audit fix --legacy-peer-deps || echo "  ⚠️  Some vulnerabilities may remain (check manually)"

# Clean up backup file
rm -f package.json.bak 2>/dev/null || true

echo ""
echo "✅ Build fixes applied!"
echo ""
echo "📋 Next steps:"
echo "  1. Review the changes"
echo "  2. Test build: npm run build"
echo "  3. Commit and push"
echo "  4. Redeploy to Vercel"
