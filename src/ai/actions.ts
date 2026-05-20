'use server';
import { ai } from '@/ai/genkit';
import { DataProcessingResult, processDataFile } from '@/lib/data-processing';
import { ProcessFileResponseSchema } from './schemas';
import * as path from 'path';
import * as fs from 'fs/promises';
import { z } from 'zod';

// Archivos estáticos: se leen directo del disco (funciona en Vercel con archivos del deploy)
async function listStaticFiles(): Promise<string[]> {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'bases-manifest.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data.files) ? data.files : [];
  } catch {
    return [];
  }
}

// Archivos subidos en runtime: se leen de Vercel Blob (si está configurado)
async function listBlobFiles(): Promise<{ name: string; url: string }[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: 'BASES DE DATOS/' });
    return blobs.map(b => ({
      name: b.pathname.replace('BASES DE DATOS/', ''),
      url: b.url,
    }));
  } catch {
    return [];
  }
}

export async function listFiles(): Promise<string[]> {
  const [staticFiles, blobFiles] = await Promise.all([
    listStaticFiles(),
    listBlobFiles(),
  ]);
  // Blob sobreescribe estático si mismo nombre
  const blobNames = blobFiles.map(f => f.name);
  const merged = [...new Set([...staticFiles, ...blobNames])];
  return merged.sort();
}

export async function processSelectedFile(fileName: string, year: number, month: number): Promise<DataProcessingResult> {
  try {
    let fileBuffer: Buffer;

    // Intentar desde Vercel Blob primero (archivos subidos en runtime)
    const blobFiles = await listBlobFiles();
    const blobMatch = blobFiles.find(f => f.name === fileName);

    if (blobMatch) {
      const res = await fetch(blobMatch.url);
      if (!res.ok) throw new Error(`Error Blob: ${res.status}`);
      fileBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      // Leer desde /public (archivos estáticos del repo)
      const filePath = path.join(process.cwd(), 'public', 'BASES DE DATOS', fileName);
      fileBuffer = await fs.readFile(filePath);
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
