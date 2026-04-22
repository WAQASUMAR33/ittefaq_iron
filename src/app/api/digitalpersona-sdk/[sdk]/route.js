import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const SDK_FILE_MAP = {
  core: ['@digitalpersona', 'core', 'dist', 'es5.bundles', 'index.umd.js'],
  websdk: ['@digitalpersona', 'websdk', 'dist', 'websdk.client.ui.js'],
  devices: ['@digitalpersona', 'devices', 'dist', 'es5.bundles', 'index.umd.js'],
};

export async function GET(request, context) {
  try {
    const params = await context?.params;
    const pathSdk = request?.nextUrl?.pathname?.split('/').filter(Boolean).pop();
    const sdk = String(params?.sdk || pathSdk || '').toLowerCase();
    const relativeParts = SDK_FILE_MAP[sdk];
    if (!relativeParts) {
      return NextResponse.json({ error: 'Unknown SDK requested.' }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'node_modules', ...relativeParts);
    const content = await fs.readFile(filePath, 'utf8');

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load SDK file.' }, { status: 500 });
  }
}
