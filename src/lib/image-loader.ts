'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

export async function loadImageAsBase64(imagePath: string): Promise<string> {
  try {
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    const fileBuffer = await fs.readFile(fullPath);
    const base64Data = fileBuffer.toString('base64');

    let mimeType = 'image/jpeg';
    if (imagePath.endsWith('.png')) {
      mimeType = 'image/png';
    } else if (imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
      mimeType = 'image/jpeg';
    }

    return `data:${mimeType};base64,${base64Data}`;
  } catch (error) {
    console.error(`Error loading image from ${imagePath}:`, error);
    return '';
  }
}
