'use server';
import { DataProcessingResult, processDataFile } from '@/lib/data-processing';
import * as path from 'path';
import * as fs from 'fs/promises';

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

        const onProgress = (percentage: number, status: string) => {
            console.log(`Progress: ${percentage}% - ${status}`);
        };

        return await processDataFile(
            { name: path.basename(fileName), buffer: fileBuffer } as any,
            year,
            month,
            onProgress
        );
    } catch (error: any) {
        console.error(`Error procesando '${fileName}':`, error);
        throw new Error(`Error al procesar '${fileName}': ${error.message}`);
    }
}

export async function listModels(): Promise<string[]> {
    return [];
}
