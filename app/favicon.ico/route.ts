import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Avoid noisy 404s in dev when the browser requests /favicon.ico.
// If you want a real favicon, place one at public/favicon.ico.
export function GET() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'public, max-age=86400',
    },
  });
}