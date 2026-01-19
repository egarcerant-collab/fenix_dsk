
'use server';
/**
 * @fileOverview Server actions for data processing.
 *
 * - processSelectedFile - Reads a file from the public folder and processes it.
 * - listFiles - Fetches the manifest of available XLSX files.
 */
import {ai} from '@/ai/genkit';
import {DataProcessingResult, processDataFile} from '@/lib/data-processing';
import {ProcessFileResponseSchema} from './schemas';
import * as path from 'path';
import * as fs from 'fs/promises';
import {z} from 'zod';
import {googleAI} from '@genkit-ai/google-genai';

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
    
    // In a server component, it's more reliable to read from the filesystem than to fetch from a URL.
    // The previous implementation failed in production because 'localhost' is not available.
    const filePath = path.join(process.cwd(), 'public', 'BASES DE DATOS', fileName);

    try {
        const fileBuffer = await fs.readFile(filePath);

        return await processFileBufferFlow({
            fileBuffer,
            fileName: path.basename(fileName),
            year,
            month
        });

    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.error(`Error procesando archivo: El archivo no se encontró en la ruta esperada: ${filePath}`);
            throw new Error(`No se pudo encontrar el archivo '${fileName}' en el servidor. Verifique que el archivo existe en la carpeta 'public/BASES DE DATOS'.`);
        }
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
