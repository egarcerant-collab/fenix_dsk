
'use server';
/**
 * @fileOverview Server actions for data processing.
 *
 * - processSelectedFile - Downloads a file from the public folder and processes it.
 * - listFiles - Fetches the manifest of available XLSX files.
 */
import {ai} from '@/ai/genkit';
import {DataProcessingResult, processDataFile} from '@/lib/data-processing';
import {ProcessFileResponseSchema} from './schemas';
import * as path from 'path';
import {z} from 'zod';
import { config } from 'dotenv';

config(); // Cargar variables de entorno desde .env

export async function listFiles(): Promise<string[]> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const manifestUrl = `${baseUrl}/bases-manifest.json`;

    try {
        // Use an absolute URL if running on the server
        const absoluteUrl = new URL(manifestUrl, 'http://localhost:9002').toString();
        const res = await fetch(absoluteUrl, { cache: "no-store" });

        if (!res.ok) {
            console.error(`Error fetching manifest: ${res.statusText} from ${absoluteUrl}`);
            return [];
        }
        
        const data = await res.json();
        return Array.isArray(data.files) ? data.files : [];

    } catch (error) {
        console.error('Error fetching file manifest:', error);
        return [];
    }
}


export async function processSelectedFile(fileName: string, year: number, month: number): Promise<DataProcessingResult> {
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || '';
    // Ensure the folder name is correctly encoded in the URL
    const fileUrl = `${baseUrl}/BASES%20DE%20DATOS/${encodeURIComponent(fileName)}`;

    try {
        const absoluteUrl = new URL(fileUrl, 'http://localhost:9002').toString();
        const res = await fetch(absoluteUrl, { cache: 'no-store' });

        if (!res.ok) {
            throw new Error(`No se pudo descargar el archivo '${fileName}' desde el servidor. Estado: ${res.status}`);
        }

        const fileBuffer = Buffer.from(await res.arrayBuffer());

        return await processFileBufferFlow({
            fileBuffer,
            fileName: fileName,
            year,
            month
        });

    } catch (error: any) {
        console.error(`Error procesando el archivo seleccionado '${fileName}':`, error);
        throw new Error(`Error al procesar el archivo '${fileName}': ${error.message}`);
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
