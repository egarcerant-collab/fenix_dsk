import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function GET() {
  const info: any = {};

  // Test 1: leer archivo
  try {
    const filePath = path.join(process.cwd(), 'public', 'BASES DE DATOS', '2026', 'ENERO.json');
    const buf = await fs.readFile(filePath);
    info.step1_readFile = `OK - ${(buf.length / 1024 / 1024).toFixed(2)} MB`;

    // Test 2: parsear JSON
    try {
      const parsed = JSON.parse(buf.toString('utf-8'));
      info.step2_parseJSON = `OK - ${parsed.length} filas, tipo: ${Array.isArray(parsed[0]) ? 'array[]' : 'object{}'}`;

      // Test 3: importar processDataFile
      try {
        const { processDataFile } = await import('@/lib/data-processing');
        info.step3_import = 'OK';

        // Test 4: ejecutar procesamiento
        try {
          const mockFile = { name: 'ENERO.json', buffer: buf };
          const result = await processDataFile(mockFile as any, 2026, 1, () => {});
          info.step4_process = `OK - TOTAL_FILAS=${result.R.TOTAL_FILAS}`;
        } catch (e: any) {
          info.step4_process = `ERROR: ${e.message}\n${e.stack?.split('\n').slice(0,3).join(' | ')}`;
        }
      } catch (e: any) {
        info.step3_import = `ERROR: ${e.message}`;
      }
    } catch (e: any) {
      info.step2_parseJSON = `ERROR: ${e.message}`;
    }
  } catch (e: any) {
    info.step1_readFile = `ERROR: ${e.message}`;
  }

  return NextResponse.json(info, { status: 200 });
}
