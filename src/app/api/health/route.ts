import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}