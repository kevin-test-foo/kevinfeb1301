import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: process.env,
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
