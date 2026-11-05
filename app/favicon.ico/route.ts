import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Serve a real icon. A cached 204 route is reconstructed with a body by Next 14.
export function GET(request: Request) {
  return NextResponse.redirect(new URL('/rfpai-icon.svg', request.url), {
    status: 308,
    headers: {
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
