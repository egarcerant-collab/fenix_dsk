import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { updateFileManifest } from '@/lib/file-manifest';

export async function POST(request: Request) {
  try {
    const { filename, data } = await request.json();

    if (!filename || !data) {
      return NextResponse.json({ error: 'Faltan datos o el nombre de archivo.' }, { status: 400 });
    }

    const publicDir = path.join(process.cwd(), 'public', 'BASES DE DATOS');
    
    const sanitizedPath = path.normalize(filename).replace(/^(\.\.[\/\\])+/, '');
    const finalPath = path.join(publicDir, sanitizedPath);

    const dirName = path.dirname(finalPath);
    await fs.mkdir(dirName, { recursive: true });

    await fs.writeFile(finalPath, JSON.stringify(data), 'utf-8');
    
    // Eliminar el archivo .xlsx antiguo si existe para evitar duplicados
    if (finalPath.endsWith('.json')) {
      const xlsxPath = finalPath.replace(/\.json$/i, '.xlsx');
      try {
        await fs.access(xlsxPath);
        await fs.unlink(xlsxPath);
        console.log(`Archivo antiguo eliminado: ${xlsxPath}`);
      } catch (e) {
        // El archivo .xlsx no existe, ignorar
      }
    }

    // Refrescar manifiesto para detectar el nuevo JSON y la eliminación del XLSX
    await updateFileManifest();

    return NextResponse.json({ success: true, path: finalPath });
  } catch (error: any) {
    console.error('Error al subir JSON:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
