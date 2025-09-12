
import { computeAllKpisForRow, KpiInput, KpiResults } from '@/lib/kpi-calculators';
import { getPopulationMap, PopulationData } from '@/lib/population';
import * as xlsx from 'xlsx';

// Types
interface DataIssues {
  dates: (string | number)[][];
  nums: (string | number)[][];
  cats: (string | number)[][];
}

export interface GroupedResult {
    keys: { dpto: string; municipio: string; ips: string; };
    results: KpiResults;
    rowCount: number;
}

export type HeaderMap = { [key: string]: number };

export interface DataProcessingResult {
    R: KpiResults & { TOTAL_FILAS: number; FALTANTES_ENCABEZADOS: string[] };
    issues: DataIssues;
    headers: string[];
    rawRows: any[][];
    groupedData: GroupedResult[];
    headerMap: HeaderMap; 
}

type ProgressCallback = (percentage: number, status: string) => void;

// Constants
const EXPECTED: { [key: string]: string[] } = {
    dpto: ['DEPARTAMENTO DE RESIDENCIA'],
    municipio: ['MUNICPIO DE RESIDENCIA', 'MUNICIPIO DE RESIDENCIA'],
    ips: ['NOMBRE DE LA IPS QUE HACE SEGUIMIENTO', 'NOMBRE DE LA  IPS QUE HACE SEGUIMIENTO'],
    edad: ['EDAD'],
    dx_hta: ['DX CONFIRMADO HTA'],
    dx_dm: ['DX CONFIRMADO DM'],
    pas_last: ['ULTIMA TENSION ARTERIAL SISTOLICA', 'ÚLTIMA TENSIÓN ARTERIAL SISTOLICA'],
    pad_last: ['ULTIMA TENSION ARTERIAL DIASTOLICA', 'ÚLTIMA TENSIÓN ARTERIAL DIASTÓLICA'],
    fecha_pa_last: ['FECHA DE LA ULTIMA TOMA DE PRESION ARTERIAL REPORTADO EN HISTORIA CLINICA', 'FECHA DE LA ULTIMA TOMA DE PRESION ARTERIAL REPORTADO EN HISTORIA CLÍNICA'],
    fecha_hba1c: ['FECHA DE REPORTE DE HEMOGLOBINA GLICOSILADA'],
    hba1c: ['REPORTE DE HEMOGLOBINA GLICOSILADA (SOLO PARA USUARIOS CON DX DE DM)'],
    fecha_creatinina: ['FECHA CREATININA SANGRE', 'FECHA CREATININA  SANGRE (mg/dl)'],
    fecha_albuminuria: ['FECHA ALBUMINURIA']
};


// --- Helper Functions ---
export const NORM = (s: any): string => (s ? String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/\s+/g, ' ') : '');


export const readXLSX = (fileBuffer: Buffer): { headers: string[], rows: any[][] } => {
    const wb = xlsx.read(fileBuffer, { type: 'buffer' });
    const mainWs = wb.Sheets[wb.SheetNames[0]];
    const mainJson = xlsx.utils.sheet_to_json(mainWs, { header: 1, defval: null });
    return { headers: (mainJson[0] as any[]) || [], rows: mainJson.slice(1) };
}

const toNumber = (val: any): number | null => {
    if (val == null || String(val).trim() === '') return null;
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    let s = String(val).trim();
    const hasComma = s.includes(','), hasDot = s.includes('.');
    if (hasComma && hasDot) {
        const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
        if (lc > ld) { s = s.replace(/\./g, '').replace(',', '.'); } 
        else { s = s.replace(/,/g, ''); }
    } else if (hasComma) { s = s.replace(/,/g, '.'); }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number' && isFinite(val) && val > 0) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const date = new Date(excelEpoch.getTime() + (val - (val > 60 ? 1 : 0)) * 86400000);
        return date;
    }
    let s = String(val).trim();
    if (!s) return null;
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [_, y, m, d] = isoMatch;
        const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
        if (!isNaN(date.getTime())) return date;
    }
    const commonMatch = s.match(/^(?:(\d{1,2})[.\/-])?(\d{1,2})[.\/-](\d{2,4})$/);
    if (commonMatch) {
        let [_, p1, p2, p3] = commonMatch;
        let day, month, year;
        let yearNum = Number(p3);
        if (p3.length <= 2) yearNum += 2000;
        day = Number(p1); month = Number(p2); year = yearNum;
        if (day > 0 && day <= 31 && month > 0 && month <= 12) {
             const date = new Date(Date.UTC(year, month - 1, day));
             if (!isNaN(date.getTime())) return date;
        }
        day = Number(p2); month = Number(p1);
        if (day > 0 && day <= 31 && month > 0 && month <= 12) {
             const date = new Date(Date.UTC(year, month - 1, day));
             if (!isNaN(date.getTime())) return date;
        }
    }
    return null;
}

const inRangeDate = (d: Date | null, y1: number, m1: number, d1: number, y2: number, m2: number, d2: number) => { 
    if (!(d instanceof Date) || isNaN(d.getTime())) return false; 
    const a = new Date(Date.UTC(y1, m1 - 1, d1)).getTime(); 
    const b = new Date(Date.UTC(y2, m2, d2, 23, 59, 59, 999)).getTime(); 
    const t = d.getTime(); 
    return t >= a && t <= b; 
}


const monthRange = (year: number, month: number) => {
    const endDate = new Date(year, month, 0);
    const startDate = new Date(year, month - 6, 1);
    return { y1: startDate.getFullYear(), m1: startDate.getMonth() + 1, d1: 1, y2: endDate.getFullYear(), m2: month -1, d2: endDate.getDate() };
}

const yearRange = (year: number, month: number) => {
    const endDate = new Date(year, month, 0);
    const startDate = new Date(year - 1, month, 1);
    return { y1: startDate.getFullYear(), m1: startDate.getMonth() + 1, d1: 1, y2: endDate.getFullYear(), m2: month -1, d2: endDate.getDate() };
}

const buildHeaderMap = (headers: string[]): { map: HeaderMap, missing: string[] } => {
    const normFileHeaders = headers.map(h => NORM(h));
    const map: HeaderMap = {};
    const missing: string[] = [];

    for (const key in EXPECTED) {
        const expectedVariants = EXPECTED[key];
        let found = false;
        for (const variant of expectedVariants) {
            const normVariant = NORM(variant);
            const idx = normFileHeaders.indexOf(normVariant);
            if (idx !== -1) {
                map[key] = idx;
                found = true;
                break;
            }
        }
        if (!found) {
            map[key] = -1;
            missing.push(expectedVariants[0]);
        }
    }
    
    return { map, missing: Array.from(new Set(missing)) };
};


const getKpiInputForRow = (row: any[], headerMap: HeaderMap, range6m: any, range12m: any): KpiInput => {
    const get = (key: string) => { const idx = headerMap[key]; return (idx === undefined || idx < 0) ? null : row[idx]; };
    
    const fPA = parseDate(get('fecha_pa_last'));
    const fH = parseDate(get('fecha_hba1c'));
    const fC = parseDate(get('fecha_creatinina'));
    const fAlb = parseDate(get('fecha_albuminuria'));
    
    const fechaOkPA = inRangeDate(fPA, range6m.y1, range6m.m1, range6m.d1, range6m.y2, range6m.m2, range6m.d2);
    const fechaHbOk = inRangeDate(fH, range6m.y1, range6m.m1, range6m.d1, range6m.y2, range6m.m2, range6m.d2);
    const fechaCOk = inRangeDate(fC, range12m.y1, range12m.m1, range12m.d1, range12m.y2, range12m.m2, range12m.d2);
    const fechaAlbOk = inRangeDate(fAlb, range12m.y1, range12m.m1, range12m.d1, range12m.y2, range12m.m2, range12m.d2);

    return { 
        edad: toNumber(get('edad')),
        htaN: NORM(get('dx_hta')),
        dmN: NORM(get('dx_dm')),
        pas: toNumber(get('pas_last')),
        pad: toNumber(get('pad_last')),
        hba1c: toNumber(get('hba1c')),
        fPA, fechaOkPA, fechaHbOk, fechaCOk, fechaAlbOk
    };
};


const computeMetrics = (
    rawRows: any[][],
    headerMap: HeaderMap,
    range6m: any,
    range12m: any,
    populationMap: Map<string, PopulationData>,
    onProgress: ProgressCallback
): Omit<DataProcessingResult, 'headers' | 'rawRows' | 'headerMap' | 'R'> & { R: KpiResults & { TOTAL_FILAS: number } } => {
    const issues: DataIssues = { dates: [], nums: [], cats: [] };

    const totalPoblacionDM = Array.from(populationMap.values()).reduce((acc, v) => acc + (v.dm || 0), 0);

    const R_accumulator: KpiResults = {
        NUMERADOR_HTA: 0, NUMERADOR_HTA_MAYORES: 0, DENOMINADOR_HTA_MAYORES: 0, NUMERADOR_DM_CONTROLADOS: 0,
        DENOMINADOR_DM_CONTROLADOS: 0, POBLACION_DM_TOTAL: totalPoblacionDM, NUMERADOR_DM: 0, NUMERADOR_HTA_MENORES: 0,
        DENOMINADOR_HTA_MENORES: 0,
        DENOMINADOR_HTA_MENORES_ARCHIVO: 0,
        NUMERADOR_CREATININA: 0, NUMERADOR_HBA1C: 0, NUMERADOR_MICROALBUMINURIA: 0, NUMERADOR_INASISTENTE: 0,
    };
    
    const get = (row: any[], key: string) => { const idx = headerMap[key]; return (idx === undefined || idx < 0) ? null : row[idx]; };

    const groupedResults: Map<string, GroupedResult> = new Map();
    const batch = Math.max(1, Math.floor(rawRows.length / 100));
    const total = rawRows.length || 1;

    for (let i0 = 0; i0 < rawRows.length; i0++) {
        const row = rawRows[i0];
        const i = i0 + 2;
        const dpto = NORM(get(row, 'dpto')) || 'N/A';
        const municipio = NORM(get(row, 'municipio')) || 'N/A';
        const ips = NORM(get(row, 'ips')) || 'N/A';
        const groupKey = `${dpto}|${municipio}|${ips}`;

        if (!groupedResults.has(groupKey)) {
             const pop = populationMap.get(groupKey) || { hta: 0, dm: 0 };
             groupedResults.set(groupKey, {
                keys: { dpto, municipio, ips },
                results: { 
                    NUMERADOR_HTA: 0, NUMERADOR_HTA_MAYORES: 0, DENOMINADOR_HTA_MAYORES: 0, NUMERADOR_DM_CONTROLADOS: 0,
                    DENOMINADOR_DM_CONTROLADOS: 0, POBLACION_DM_TOTAL: pop.dm,
                    NUMERADOR_DM: 0, NUMERADOR_HTA_MENORES: 0,
                    DENOMINADOR_HTA_MENORES: pop.hta,
                    DENOMINADOR_HTA_MENORES_ARCHIVO: 0,
                    NUMERADOR_CREATININA: 0, NUMERADOR_HBA1C: 0, NUMERADOR_MICROALBUMINURIA: 0, NUMERADOR_INASISTENTE: 0,
                },
                rowCount: 0
            });
             R_accumulator.DENOMINADOR_HTA_MENORES += pop.hta;
        }

        const group = groupedResults.get(groupKey)!;
        
        const kpiInput = getKpiInputForRow(row, headerMap, range6m, range12m);
        const kpiResults = computeAllKpisForRow(kpiInput);

        group.rowCount++;
        
        Object.keys(kpiResults).forEach(keyStr => {
            const key = keyStr as keyof KpiResults;
            // This is safe because POBLACION_DM_TOTAL and DENOMINADOR_HTA_MENORES are not in kpiResults
            group.results[key] = (group.results[key] || 0) + kpiResults[key];
        });
        
        if (i0 % batch === 0 || i0 === rawRows.length - 1) onProgress(((i0 + 1) / total) * 90 + 10, `Procesando fila ${i0 + 1} de ${total}…`);
    }
    
    // Sum up everything for the main accumulator from the final groups
    const calculableKeys = Object.keys(computeAllKpisForRow({} as any)) as (keyof Omit<KpiResults, 'POBLACION_DM_TOTAL' | 'DENOMINADOR_HTA_MENORES'>)[];

    for (const key of calculableKeys) {
        R_accumulator[key] = Array.from(groupedResults.values()).reduce((acc, g) => acc + g.results[key], 0);
    }


    const groupedData = Array.from(groupedResults.values()).sort((a, b) => {
        if (a.keys.dpto < b.keys.dpto) return -1; if (a.keys.dpto > b.keys.dpto) return 1;
        if (a.keys.municipio < b.keys.municipio) return -1; if (a.keys.municipio > b.keys.municipio) return 1;
        if (a.keys.ips < b.keys.ips) return -1; if (a.keys.ips > b.keys.ips) return 1;
        return 0;
    });

    const R = { ...R_accumulator, TOTAL_FILAS: rawRows.length };
    return { R, issues, groupedData };
}


export async function processDataFile(
    file: { name: string; buffer: Buffer },
    year: number,
    month: number,
    onProgress: ProgressCallback
): Promise<DataProcessingResult> {
    
    const range6m = monthRange(year, month);
    const range12m = yearRange(year, month);

    onProgress(2, 'Cargando datos de población desde el servidor...');
    const populationMap = await getPopulationMap();
    
    onProgress(5, 'Leyendo archivo de Excel...');
    const data = readXLSX(file.buffer);
    
    onProgress(10, 'Preparando para calcular métricas...');
    
    const { map: headerMap, missing } = buildHeaderMap(data.headers);

    const requiredColumns = ['DEPARTAMENTO DE RESIDENCIA', 'MUNICPIO DE RESIDENCIA', 'NOMBRE DE LA IPS QUE HACE SEGUIMIENTO'];
    const normRequired = requiredColumns.map(NORM);
    const normMissing = missing.map(NORM);
    const missingRequired = normRequired.filter(req => normMissing.includes(req));

    if (missingRequired.length > 0) {
        throw new Error(`Faltan columnas clave para la agrupación (Departamento, IPS, Municipio). Columnas faltantes: ${missingRequired.join(', ')}`);
    }

    const { R, issues, groupedData } = computeMetrics(data.rows, headerMap, range6m, range12m, populationMap, onProgress);
    
    const finalR = { ...R, FALTANTES_ENCABEZADOS: missing };

    onProgress(100, 'Cálculo completado.');
    return { R: finalR, issues, headers: data.headers, rawRows: data.rows, groupedData, headerMap };
}


