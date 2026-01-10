// Auto-generated smoke tests for core functionality (Next.js + NextAuth v5)
import { describe, it, expect, vi } from '@jest/globals';
import { authOptions } from '../auth';
import { auth } from 'next-auth/middleware';
import type { NextRequest } from 'next/server';

describe('Core App Smoke Tests', () => {
  it('authOptions should be defined', () => {
    expect(authOptions).toBeDefined();
    expect(authOptions.providers).toBeDefined();
  });

  it('middleware auth should exist', () => {
    expect(auth).toBeDefined();
  });

  it('basic env vars present', () => {
    expect(process.env.NEXTAUTH_SECRET).toBeDefined();
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.GROK_API_KEY).toBeDefined();
  });

  it('auth middleware handles request (mock)', () => {
    const mockReq = { headers: { get: vi.fn() } } as unknown as NextRequest;
    const result = auth(mockReq);
    expect(result).toBeDefined();
  });
});