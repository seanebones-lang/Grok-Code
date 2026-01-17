// POST: Generate agent stub
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const { name, desc, tools } = await req.json();
  const stub = `import sys\n# ${desc}\ncode = sys.argv[1]\nprint(f'${name}: {{code}} -> Analyzed w/ ${tools.join(', ')}')`;
  const filePath = path.join(process.cwd(), 'sandbox/agents', `${name}_agent.py`);
  fs.writeFileSync(filePath, stub);
  return NextResponse.json({ success: true, agent: name });
}