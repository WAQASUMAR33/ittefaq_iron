import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.DATABASE_URL || '';
  const masked = url.replace(/:[^@]+@/, ':****@');
  return NextResponse.json({ database_url: masked });
}
