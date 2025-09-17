
'use server';
/**
 * @fileOverview Server actions for data processing.
 *
 * - processSelectedFile - Downloads a file from the public folder and processes it.
 * - listFiles - Fetches the manifest of available XLSX files.
 * - listModels - Fetches the list of available AI models from the provider.
 */
import {ai} from '@/ai/genkit';
import {DataProcessingResult, processDataFile} from '@/lib/data-processing';
import {ProcessFileResponseSchema} from './schemas';
import * as path from 'path';
import * as fs from 'fs/promises';
import {z} from 'zod';
import {listModels as genkitListModels} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export async function listFiles(): Promise<string[]> {
    const manifestPath = path.join(process.cwd(), 'public', 'bases-manifest.json');

    try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const data = JSON.parse(manifestContent);
        return Array.isArray(data.files) ? data.files : [];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.warn(`Advertencia: El archivo de manifiesto no se encontró en '${manifestPath}'. Ejecute el script de precompilación.`);
        } else {
            console.error('Error al leer o analizar el manifiesto de archivos:', error);
        }
        return [];
    }
}


export async function processSelectedFile(fileName: string, year: number, month: number): Promise<DataProcessingResult> {
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || '';
    // La ruta del archivo ahora puede contener subdirectorios, así que la dividimos y la codificamos
    const encodedPathParts = fileName.split('/').map(part => encodeURIComponent(part));
    const encodedFileName = encodedPathParts.join('/');
    const fileUrl = `${baseUrl}/BASES%20DE%20DATOS/${encodedFileName}`;

    try {
        // En el entorno del servidor de Next.js, necesitamos una URL absoluta para `fetch`
        const internalUrl = new URL(fileUrl, 'http://localhost:9002');
        const res = await fetch(internalUrl, { cache: 'no-store' });

        if (!res.ok) {
            throw new Error(`No se pudo descargar el archivo '${fileName}' desde el servidor. Estado: ${res.status}`);
        }

        const fileBuffer = Buffer.from(await res.arrayBuffer());

        return await processFileBufferFlow({
            fileBuffer,
            fileName: path.basename(fileName), // Pasamos solo el nombre del archivo para mantener la lógica original
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


export async function listModels(): Promise<string[]> {
    const models = await genkitListModels();
    return models
        .filter(m => m.name.startsWith('googleai/'))
        .map(m => m.name.replace('googleai/', ''))
        .sort();
}
