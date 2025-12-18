import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Serve the static HTML file at /game/10.html
export async function GET() {
  const filePath = path.join(process.cwd(), 'game', '10.html');
  const html = await fs.readFile(filePath, 'utf8');

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

