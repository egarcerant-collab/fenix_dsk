
'use server';
import {ai} from '@/ai/genkit';
import {DataProcessingResult, processDataFile} from '@/lib/data-processing';
import {ProcessFileResponseSchema} from './schemas';
import * as path from 'path';
import * as fs from 'fs/promises';
import {z} from 'zod';
import {googleAI} from '@genkit-ai/google-genai';

// Obtiene la base URL del app (funciona en Vercel y local)
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

// Devuelve archivos del Blob (subidos por el usuario en runtime)
async function listBlobFiles(): Promise<{ name: string; url: string }[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/upload-json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.files) ? data.files : [];
  } catch {
    return [];
  }
}

// Devuelve archivos estáticos del manifiesto (en /public)
async function listStaticFiles(): Promise<string[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/bases-manifest.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.files) ? data.files : [];
    }
  } catch {}
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'bases-manifest.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data.files) ? data.files : [];
  } catch {
    return [];
  }
}

export async function listFiles(): Promise<string[]> {
  const [staticFiles, blobFiles] = await Promise.all([
    listStaticFiles(),
    listBlobFiles(),
  ]);
  const blobNames = blobFiles.map(f => f.name);
  // Merge: blob tiene prioridad sobre estáticos (sobreescribe si mismo nombre)
  const merged = [...new Set([...staticFiles, ...blobNames])];
  return merged.sort();
}

export async function processSelectedFile(fileName: string, year: number, month: number): Promise<DataProcessingResult> {
  try {
    let fileBuffer: Buffer;

    // Intentar desde Blob primero
    const blobFiles = await listBlobFiles();
    const blobMatch = blobFiles.find(f => f.name === fileName || f.name.endsWith(`/${path.basename(fileName)}`));

    if (blobMatch) {
      const res = await fetch(blobMatch.url);
      if (!res.ok) throw new Error(`Error al obtener archivo desde Blob: ${res.status}`);
      fileBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      // Leer desde /public (archivos estáticos del repo)
      const encodedPath = fileName.split('/').map(p => encodeURIComponent(p)).join('/');
      const url = `${getBaseUrl()}/BASES%20DE%20DATOS/${encodedPath}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error al obtener archivo estático: ${res.status}`);
      fileBuffer = Buffer.from(await res.arrayBuffer());
    }

    return await processFileBufferFlow({
      fileBuffer,
      fileName: path.basename(fileName),
      year,
      month,
    });
  } catch (error: any) {
    console.error(`Error procesando '${fileName}':`, error);
    throw new Error(`Error al procesar '${fileName}': ${error.message}`);
  }
}

const processFileBufferFlow = ai.defineFlow(
  {
    name: 'processFileBufferFlow',
    inputSchema: z.object({
      fileBuffer: z.any(),
      fileName: z.string(),
      year: z.number(),
      month: z.number(),
    }),
    outputSchema: ProcessFileResponseSchema,
  },
  async ({ fileBuffer, fileName, year, month }) => {
    const onProgress = (percentage: number, status: string) => {
      console.log(`Progress: ${percentage}% - ${status}`);
    };
    return await processDataFile({ name: fileName, buffer: fileBuffer } as any, year, month, onProgress);
  }
);

export async function listModels(): Promise<string[]> {
  const models = await ai.listModels();
  return models.map(m => m.name.replace('googleai/', '')).sort();
}
