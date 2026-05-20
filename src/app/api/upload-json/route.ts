import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

// GET: listar archivos subidos via blob
export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'BASES DE DATOS/' });
    const files = blobs.map(b => ({
      name: b.pathname.replace('BASES DE DATOS/', ''),
      url: b.url,
    }));
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [] });
  }
}

// POST: subir nuevo archivo JSON a Vercel Blob
export async function POST(request: Request) {
  try {
    const { filename, data } = await request.json();

    if (!filename || !data) {
      return NextResponse.json({ error: 'Faltan datos o el nombre de archivo.' }, { status: 400 });
    }

    const blob = await put(
      `BASES DE DATOS/${filename}`,
      JSON.stringify(data),
      { access: 'public', contentType: 'application/json' }
    );

    return NextResponse.json({ success: true, url: blob.url, filename });
  } catch (error: any) {
    console.error('Error al subir JSON a Blob:', error);
    return NextResponse.json({ error: error.message || 'Error al subir archivo.' }, { status: 500 });
  }
}
