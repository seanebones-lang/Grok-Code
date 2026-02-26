/**
 * NextAuth.js API Route Handler
 * Handles all authentication routes: /api/auth/*, /api/auth/callback/github, etc.
 */

import { handlers } from "../../../../../auth"

// Export GET and POST handlers for NextAuth.js
export const { GET, POST } = handlers

// NextAuth v5 automatically handles:
// - GET /api/auth/signin - Sign in page
// - POST /api/auth/signin/github - GitHub OAuth sign in
// - GET /api/auth/callback/github - OAuth callback
// - POST /api/auth/signout - Sign out
// - GET /api/auth/session - Get current session
// - GET /api/auth/providers - List available providers
