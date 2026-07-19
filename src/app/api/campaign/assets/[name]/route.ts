import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> | { name: string } }
) {
  try {
    const resolvedParams = await params;
    const name = resolvedParams.name;

    // Prevent directory traversal
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
      return new Response('Access Denied', { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'campaigns', 'worldcup-final', name);

    if (!fs.existsSync(filePath)) {
      return new Response('Asset Not Found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    let contentType = 'image/webp';
    if (name.endsWith('.json')) {
      contentType = 'application/json';
    } else if (name.endsWith('.js') || name.endsWith('.ts')) {
      contentType = 'application/javascript';
    } else if (name.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    }

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    return new Response(error.message || 'Internal Server Error', { status: 500 });
  }
}
