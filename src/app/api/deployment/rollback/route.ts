import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: 'Rollback stubbed (add DB for full)' }, { status: 200 });
}