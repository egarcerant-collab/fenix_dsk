
'use server';
/**
 * @fileOverview Server actions for data processing.
 *
 * - processUploadedFile - A flow that takes an uploaded file, processes it against a local population CSV, and returns calculated KPIs.
 * - processLocalTestFile - A flow that takes a hardcoded local file, processes it, and returns KPIs.
 */
import {ai} from '@/ai/genkit';
import {DataProcessingResult, processDataFile} from '@/lib/data-processing';
import {ProcessFileRequestSchema, ProcessFileResponseSchema, ProcessFileInput, ReportDataSchema} from './schemas';
import * as fs from 'fs';
import * as path from 'path';
import {z} from 'zod';
import { config } from 'dotenv';

config(); // Cargar variables de entorno desde .env

export async function listFiles(): Promise<string[]> {
    const dirPath = path.join(process.cwd(), 'public', 'BASES DE DATOS');
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        const files = fs.readdirSync(dirPath);
        return files.filter(file => file.toLowerCase().endsWith('.xlsx'));
    } catch (error) {
        console.error('Error reading database directory:', error);
        return [];
    }
}

export async function processSelectedFile(filePath: string, year: number, month: number): Promise<DataProcessingResult> {
    return processLocalFileFlow({ filePath, year, month });
}


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

const processLocalFileFlow = ai.defineFlow(
    {
        name: 'processLocalFileFlow',
        inputSchema: z.object({
            filePath: z.string(),
            year: z.number(),
            month: z.number(),
        }),
        outputSchema: ProcessFileResponseSchema,
    },
    async ({ filePath, year, month }) => {
        const fullPath = path.join(process.cwd(), filePath);
        
        try {
            if (!fs.existsSync(fullPath)) {
                throw new Error(`El archivo "${filePath}" no se encuentra en el servidor en la ruta: ${fullPath}`);
            }
            const fileBuffer = fs.readFileSync(fullPath);

            return await processFileBufferFlow({
                fileBuffer,
                fileName: path.basename(filePath),
                year,
                month
            });

        } catch (error: any) {
            console.error('Error reading local file:', error);
            throw new Error(`Error al leer el archivo "${filePath}": ${error.message}`);
        }
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
        const testFilePath = process.env.TEST_FILE_PATH;

        if (!testFilePath) {
            throw new Error("La variable de entorno TEST_FILE_PATH no está definida en el archivo .env");
        }

        try {
            // El flujo processLocalFileFlow ya construye la ruta completa con process.cwd()
            return await processLocalFileFlow({ filePath: testFilePath, year, month });
        } catch (error: any) {
            console.error('Error in local test file flow:', error);
            // Propagar el error del flujo subyacente que ya es descriptivo
            throw error;
        }
    }
);
