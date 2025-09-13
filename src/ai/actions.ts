
'use server';
/**
 * @fileOverview Server actions for data processing.
 *
 * - processUploadedFile - A flow that takes an uploaded file, processes it against a local population CSV, and returns calculated KPIs.
 * - processLocalTestFile - A flow that takes a hardcoded local file, processes it, and returns KPIs.
 */
import {ai} from '@/ai/genkit';
import {DataProcessingResult, processDataFile} from '@/lib/data-processing';
import {ProcessFileRequestSchema, ProcessFileResponseSchema, ProcessFileInput} from './schemas';
import * as fs from 'fs';
import * as path from 'path';
import {z} from 'zod';

export async function processUploadedFile(input: ProcessFileInput): Promise<DataProcessingResult> {
    return processFileFlow(input);
}

export async function processLocalTestFile(year: number, month: number): Promise<DataProcessingResult> {
    return processLocalTestFileFlow({ year, month });
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


const processFileFlow = ai.defineFlow(
  {
    name: 'processFileFlow',
    inputSchema: ProcessFileRequestSchema,
    outputSchema: ProcessFileResponseSchema,
  },
  async ({ fileDataUri, year, month }) => {
    
    const base64Data = fileDataUri.split(',')[1];
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    return await processFileBufferFlow({
        fileBuffer,
        fileName: 'uploaded.xlsx',
        year,
        month
    });
  }
);

const processLocalTestFileFlow = ai.defineFlow(
    {
        name: 'processLocalTestFileFlow',
        inputSchema: z.object({
            year: z.number(),
            month: z.number(),
        }),
        outputSchema: ProcessFileResponseSchema,
    },
    async ({ year, month }) => {
        const filePath = path.join(process.cwd(), 'public', 'JEFE LIRENIS JULIO 2025.xlsx');
        
        try {
            const fileBuffer = fs.readFileSync(filePath);

            return await processFileBufferFlow({
                fileBuffer,
                fileName: 'JEFE LIRENIS JULIO 2025.xlsx',
                year,
                month
            });

        } catch (error) {
            console.error('Error reading local test file:', error);
            throw new Error('No se pudo encontrar o leer el archivo de prueba local "JEFE LIRENIS JULIO 2025.xlsx" en la carpeta /public.');
        }
    }
);
