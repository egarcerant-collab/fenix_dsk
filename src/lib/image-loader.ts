'use server';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function loadImageAsBase64(imagePath: string): Promise<string> {
  try {
    // Quitar slash inicial para que path.join funcione correctamente
    const relPath  = imagePath.replace(/^\/+/, '');
    const fullPath = path.join(process.cwd(), 'public', relPath);
    const buffer   = await fs.readFile(fullPath);
    const mime     = relPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (e) {
    console.error('loadImageAsBase64 error:', e);
    return '';
  }
}
