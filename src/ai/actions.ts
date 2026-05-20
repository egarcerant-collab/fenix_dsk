'use server';
import {ai} from '@/ai/genkit';
import {DataProcessingResult, processDataFile} from '@/lib/data-processing';
import {ProcessFileResponseSchema} from './schemas';
import * as path from 'path';
import * as fs from 'fs/promises';
import {z} from 'zod';

export async function listFiles(): Promise<string[]> {
    try {
        const manifestPath = path.join(process.cwd(), 'public', 'bases-manifest.json');
        const content = await fs.readFile(manifestPath, 'utf-8');
        const data = JSON.parse(content);
        return Array.isArray(data.files) ? data.files : [];
    } catch {
        return [];
    }
}

export async function processSelectedFile(fileName: string, year: number, month: number): Promise<DataProcessingResult> {
    try {
        const filePath = path.join(process.cwd(), 'public', 'BASES DE DATOS', fileName);
        const fileBuffer = await fs.readFile(filePath);

        return await processFileBufferFlow({
            fileBuffer,
            fileName: path.basename(fileName),
            year,
            month
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
    const mockFile = { name: fileName, buffer: fileBuffer };
    const onProgress = (percentage: number, status: string) => {
        console.log(`Progress: ${percentage}% - ${status}`);
    };
    return await processDataFile(mockFile as any, year, month, onProgress);
  }
);

export async function listModels(): Promise<string[]> {
    const models = await ai.listModels();
    return models.map(m => m.name.replace('googleai/', '')).sort();
}
