import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function GET() {
  const info: any = {
    vercelUrl: process.env.VERCEL_URL || 'NO SETEADO (local)',
    nodeEnv: process.env.NODE_ENV,
    cwd: process.cwd(),
  };

  // Test 1: leer manifest con fs.readFile
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'bases-manifest.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    const data = JSON.parse(content);
    info.manifest_fs = `OK - ${data.files?.length} archivos`;
  } catch (e: any) {
    info.manifest_fs = `ERROR: ${e.message}`;
  }

  // Test 2: fetch HTTP a manifest
  if (process.env.VERCEL_URL) {
    try {
      const url = `https://${process.env.VERCEL_URL}/bases-manifest.json`;
      info.manifest_url = url;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      info.manifest_http = `HTTP ${res.status}`;
      if (res.ok) {
        const data = await res.json();
        info.manifest_http += ` - ${data.files?.length} archivos`;
      }
    } catch (e: any) {
      info.manifest_http = `ERROR: ${e.message}`;
    }
  }

  // Test 3: fetch HTTP a ENERO.json
  if (process.env.VERCEL_URL) {
    try {
      const url = `https://${process.env.VERCEL_URL}/BASES%20DE%20DATOS/2026/ENERO.json`;
      info.enero_url = url;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      info.enero_http = `HTTP ${res.status} - ${res.headers.get('content-length') || '?'} bytes`;
    } catch (e: any) {
      info.enero_http = `ERROR: ${e.message}`;
    }
  }

  // Test 4: leer ENERO.json con fs.readFile
  try {
    const filePath = path.join(process.cwd(), 'public', 'BASES DE DATOS', '2026', 'ENERO.json');
    const stat = await fs.stat(filePath);
    info.enero_fs = `OK - ${(stat.size / 1024 / 1024).toFixed(2)} MB`;
  } catch (e: any) {
    info.enero_fs = `ERROR: ${e.message}`;
  }

  return NextResponse.json(info, { status: 200 });
}
