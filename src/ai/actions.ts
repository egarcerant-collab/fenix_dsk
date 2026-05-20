'use server';
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

export async function listModels(): Promise<string[]> {
    return [];
}
