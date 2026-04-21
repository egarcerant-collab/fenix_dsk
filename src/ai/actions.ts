
'use server';
/**
 * @fileOverview Server actions for data processing.
 *
 * - processSelectedFile - Reads a file from the public folder and processes it.
 * - listFiles - Fetches the manifest of available XLSX files, updating it if necessary.
 */
import {ai} from '@/ai/genkit';
import {DataProcessingResult, processDataFile} from '@/lib/data-processing';
import {ProcessFileResponseSchema} from './schemas';
import * as path from 'path';
import * as fs from 'fs/promises';
import {z} from 'zod';
import {googleAI} from '@genkit-ai/google-genai';
import { updateFileManifest } from '@/lib/file-manifest';

export async function listFiles(): Promise<string[]> {
    try {
        await updateFileManifest();
    } catch (e) {
        console.warn("Could not update file manifest", e);
    }

    // En Vercel, la carpeta public no está disponible en fs, hay que hacer fetch
    if (process.env.VERCEL_URL) {
        try {
            const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
            const url = `${protocol}://${process.env.VERCEL_URL}/bases-manifest.json`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                return Array.isArray(data.files) ? data.files : [];
            }
        } catch (e) {
            console.error("Vercel fetch failed for manifest", e);
        }
    }

    const manifestPath = path.join(process.cwd(), 'public', 'bases-manifest.json');

    try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const data = JSON.parse(manifestContent);
        return Array.isArray(data.files) ? data.files : [];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.warn(`Advertencia: El archivo de manifiesto no se encontró en '${manifestPath}'. Se devolverá una lista vacía.`);
        } else {
            console.error('Error al leer o analizar el manifiesto de archivos:', error);
        }
        return [];
    }
}


export async function processSelectedFile(fileName: string, year: number, month: number): Promise<DataProcessingResult> {
    try {
        let fileBuffer: Buffer;

        if (process.env.VERCEL_URL) {
            const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
            // Encode URI components to handle spaces in folder names correctly
            const encodedPath = fileName.split('/').map(part => encodeURIComponent(part)).join('/');
            const url = `${protocol}://${process.env.VERCEL_URL}/BASES%20DE%20DATOS/${encodedPath}`;
            
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to fetch from Vercel URL: ${res.status} ${res.statusText}`);
            
            const arrayBuffer = await res.arrayBuffer();
            fileBuffer = Buffer.from(arrayBuffer);
        } else {
            const filePath = path.join(process.cwd(), 'public', 'BASES DE DATOS', fileName);
            fileBuffer = await fs.readFile(filePath);
        }

        return await processFileBufferFlow({
            fileBuffer,
            fileName: path.basename(fileName),
            year,
            month
        });

    } catch (error: any) {
        console.error(`Error procesando el archivo seleccionado '${fileName}':`, error);
        throw new Error(`Error inesperado al procesar el archivo '${fileName}': ${error.message}`);
    }
}


// Reusable flow for processing a file buffer
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
    
    const mockFile = {
        name: fileName,
        buffer: fileBuffer,
    };
    
    const onProgress = (percentage: number, status: string) => {
        console.log(`Processing Progress: ${percentage}% - ${status}`);
    };

    const results = await processDataFile(mockFile as any, year, month, onProgress);
    
    return results;
  }
);


export async function listModels(): Promise<string[]> {
    const models = await ai.listModels();
    return models
        .map(m => m.name.replace('googleai/', ''))
        .sort();
}
