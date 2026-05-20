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

        const result = await processDataFile(
            { name: path.basename(fileName), buffer: fileBuffer } as any,
            year,
            month,
            (pct, status) => console.log(`${pct}% - ${status}`)
        );

        // rawRows son ~18MB — demasiado para serializar en un Server Action
        // Los KPIs, gráficas y PDF funcionan sin ellos
        return {
            ...result,
            rawRows: [],
            issues: {
                dates: result.issues.dates.slice(0, 50),
                nums: result.issues.nums.slice(0, 50),
                cats: result.issues.cats.slice(0, 50),
            },
        };
    } catch (error: any) {
        console.error(`Error procesando '${fileName}':`, error);
        throw new Error(`Error al procesar '${fileName}': ${error.message}`);
    }
}

export async function listModels(): Promise<string[]> {
    return [];
}
