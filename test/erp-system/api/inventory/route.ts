import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  const items = await prisma.inventory.findMany();
  return NextResponse.json({ items });
}

export async function POST(request) {
  const { name } = await request.json();
  const item = await prisma.inventory.create({ data: { name } });
  return NextResponse.json(item);
}