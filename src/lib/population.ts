// @/lib/population.ts
import * as xlsx from 'xlsx';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type PopulationData = { hta: number; dm: number };

// Debe ser el mismo NORM que ya usas
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

// Intenta: public/POBLACION_2.csv -> ./POBLACION_2.csv -> fetch('/POBLACION_2.csv')
async function loadPopulationCsv(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), 'public', 'Poblacion 2025.csv'),
    path.join(process.cwd(), 'Poblacion 2025.csv'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        let txt = fs.readFileSync(p, 'utf8');
        if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1); // quitar BOM
        return txt;
      }
    } catch { /* sigue intentando */ }
  }

  // Fallback para entorno cliente/hosting estático
  try {
    const urlCandidates = ['/Poblacion%202025.csv', '/Poblacion 2025.csv'];
    for (const u of urlCandidates) {
      const res = await fetch(u);
      if (res.ok) return await res.text();
    }
  } catch { /* ignore */ }

  throw new Error('No se encontró el archivo de población (Poblacion 2025.csv) en public/ ni accesible por fetch().');
}

export async function getPopulationMap(): Promise<Map<string, PopulationData>> {
  const text = await loadPopulationCsv();

  // Detectar separador: ; , \t |
  const firstLine = (text.split(/\r?\n/).find(l => l.trim()) || '');
  const candidates = [';', ',', '\t', '|'] as const;
  let sep: typeof candidates[number] = ';';
  let best = -1;
  for (const c of candidates) {
    const k = (firstLine.match(new RegExp(`\\${c}`, 'g')) || []).length;
    if (k > best) { best = k; sep = c; }
  }

  // Parsear con xlsx para robustez (respeta comillas/escapes)
  const wb = xlsx.read(text.replace(/\r\n/g, '\n'), { type: 'string', FS: sep, raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const arr: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null }) as any;

  let headers: string[] = (arr[0] || []).map(v => v == null ? '' : String(v));
  let rows: any[][] = arr.slice(1);

  // Si la 1ª col es "#", elimínala
  if (headers.length && /^#$/i.test(headers[0].trim())) {
    headers.shift();
    rows = rows.map(r => r.slice(1));
  }

  // Mapear índices de columnas (tolerando variantes)
  const HN = headers.map(h => NORM(h));
  
  const findIndex = (variants: string[]) => {
      for(const variant of variants) {
          const idx = HN.indexOf(NORM(variant));
          if(idx !== -1) return idx;
      }
      return -1;
  }

  const idxDpto = findIndex(['DEPARTAMENTO DE RESIDENCIA']);
  const idxMpio = findIndex(['MUNICPIO DE RESIDENCIA', 'MUNICIPIO DE RESIDENCIA']);
  const idxIps = findIndex(['NOMBRE DE LA  IPS QUE HACE SEGUIMIENTO', 'NOMBRE DE LA IPS QUE HACE SEGUIMIENTO']);
  const idxHta = findIndex(['POBLACION HTA']);
  const idxDm  = findIndex(['POBLACION DM']);

  const missingCols = [];
  if (idxDpto === -1) missingCols.push('DEPARTAMENTO DE RESIDENCIA');
  if (idxMpio === -1) missingCols.push('MUNICIPIO DE RESIDENCIA');
  if (idxIps === -1) missingCols.push('NOMBRE DE LA IPS QUE HACE SEGUIMIENTO');
  if (idxHta === -1) missingCols.push('POBLACION HTA');
  if (idxDm === -1) missingCols.push('POBLACION DM');
  
  if (missingCols.length > 0) {
      throw new Error(`Archivo de población '${wb.SheetNames[0]}': Faltan las siguientes columnas requeridas: ${missingCols.join(', ')}.`);
  }


  const map = new Map<string, PopulationData>();

  for (const r of rows) {
      if(!r || r.length === 0 || r.every(cell => cell === null)) continue;
      
    const dpto = NORM(r[idxDpto]);
    const mpio = NORM(r[idxMpio]);
    const ips  = NORM(r[idxIps]);
    if (!dpto || !mpio || !ips) continue;

    const key = `${dpto}|${mpio}|${ips}`;
    const hta = toNumber(r[idxHta]);
    const dm  = toNumber(r[idxDm]);

    // Si hay repetidos, acumula
    const prev = map.get(key) || { hta: 0, dm: 0 };
    map.set(key, { hta: prev.hta + hta, dm: prev.dm + dm });
  }

  return map;
}
