
import * as fs from 'node:fs';
import * as path from 'node:path';

export type PopulationData = { hta: number; dm: number };

export const NORM = (s: any): string =>
  (s ? String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().toUpperCase().replace(/\s+/g, ' ') : '');

function toNumber(val: any): number {
  if (val == null || String(val).trim() === '') return 0;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  let s = String(val).trim();
  const hasComma = s.includes(','), hasDot = s.includes('.');
  if (hasComma && hasDot) {
    const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    s = (lc > ld) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (hasComma) {
    s = s.replace(/,/g, '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

async function loadPopulationCsv(): Promise<string> {
  const filePath = path.join(process.cwd(), 'public', 'Poblacion 2025.csv');
  try {
    if (fs.existsSync(filePath)) {
      let txt = fs.readFileSync(filePath, 'utf8');
      if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1); 
      return txt;
    }
  } catch (e) {
     console.error("Error reading population file from disk:", e);
  }
  throw new Error('No se encontró el archivo de población (Poblacion 2025.csv) en la carpeta /public.');
}

export async function getPopulationMap(): Promise<Map<string, PopulationData>> {
  const fileContent = await loadPopulationCsv();
  const lines = fileContent.split(/\r?\n/);
  
  if (lines.length < 2) {
      throw new Error("El archivo de población CSV está vacío o solo contiene encabezados.");
  }

  const headers = lines[0].split(';').map(h => NORM(h.trim()));
  
  const findIndex = (variants: string[]) => {
      for(const variant of variants) {
          const idx = headers.indexOf(NORM(variant));
          if(idx !== -1) return idx;
      }
      return -1;
  }

  const idxDpto = findIndex(['DEPARTAMENTO DE RESIDENCIA']);
  const idxMpio = findIndex(['MUNICIPIO DE RESIDENCIA', 'MUNICPIO DE RESIDENCIA']);
  const idxIps = findIndex(['NOMBRE DE LA IPS QUE HACE SEGUIMIENTO']);
  const idxHta = findIndex(['POBLACION HTA']);
  const idxDm  = findIndex(['POBLACION DM']);

  const missingCols: string[] = [];
  if (idxDpto === -1) missingCols.push('DEPARTAMENTO DE RESIDENCIA');
  if (idxMpio === -1) missingCols.push('MUNICIPIO DE RESIDENCIA');
  if (idxIps === -1) missingCols.push('NOMBRE DE LA IPS QUE HACE SEGUIMIENTO');
  if (idxHta === -1) missingCols.push('POBLACION HTA');
  if (idxDm === -1) missingCols.push('POBLACION DM');
  
  if (missingCols.length > 0) {
      throw new Error(`Archivo de población: Faltan las siguientes columnas requeridas: ${missingCols.join(', ')}. Encabezados encontrados: ${headers.join(', ')}`);
  }

  const map = new Map<string, PopulationData>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(';');

    const dpto = NORM(values[idxDpto]);
    const mpio = NORM(values[idxMpio]);
    const ips  = NORM(values[idxIps]);
    
    if (!dpto || !mpio || !ips) continue;

    const key = `${dpto}|${mpio}|${ips}`;
    const hta = toNumber(values[idxHta]);
    const dm  = toNumber(values[idxDm]);

    const prev = map.get(key) || { hta: 0, dm: 0 };
    map.set(key, { hta: prev.hta + hta, dm: prev.dm + dm });
  }

  return map;
}
