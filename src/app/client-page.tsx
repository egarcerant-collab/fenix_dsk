

"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, FileDown, Loader2, FlaskConical, FileText, Files, RefreshCw, Trash2, Cpu, Eye } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Script from 'next/script';
import { DataProcessingResult, GroupedResult, KpiResults, HeaderMap, processRawData } from '@/lib/data-processing';
import { listFiles } from '@/ai/actions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from "@/hooks/use-toast";
import JSZip from 'jszip';
import { descargarInformePDF, buildDocDefinition, InformeDatos, PdfImages } from '@/lib/informe-riesgo-pdf';
import { loadImageAsBase64 } from '@/lib/image-loader';
import { Toaster } from '@/components/ui/toaster';


// Make XLSX global if it's loaded from a script
declare global {
  interface Window { XLSX: any; }
}

export default function ClientPage() {
  const { toast } = useToast();
  const [xlsxLoaded, setXlsxLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Listo para procesar.');
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [lastResults, setLastResults] = useState<DataProcessingResult | null>(null);
  const [selectedIpsForPdf, setSelectedIpsForPdf] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('all');
  const [selectedIps, setSelectedIps] = useState<string>('all');

  const [yearForPdf, setYearForPdf] = useState<number>(new Date().getFullYear());
  const [monthForPdf, setMonthForPdf] = useState<number>(new Date().getMonth() + 1);

  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isExportPreviewOpen, setIsExportPreviewOpen] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{done:number;total:number}|null>(null);


  const fetchFiles = useCallback(() => {
    setIsRefreshing(true);
    
    // Primero intentamos leer el manifiesto directamente desde el cliente (ideal para Vercel)
    fetch('/bases-manifest.json', { cache: 'no-store' })
      .then(async res => {
          if (!res.ok) throw new Error("Manifest not found via HTTP");
          const data = await res.json();
          const files = Array.isArray(data.files) ? data.files : [];
          return files;
      })
      .catch(err => {
          console.warn("Failed to fetch manifest directly, falling back to server action:", err);
          return listFiles();
      })
      .then((files: string[]) => {
          setAvailableFiles(files);
          const years = [...new Set(files.map(f => f.split('/')[0]))].sort().reverse();
          setAvailableYears(years);

          if (years.length > 0) {
              const latestYear = years[0];
              setSelectedYear(currentYear => years.includes(currentYear) ? currentYear : latestYear);
          } else if (files.length === 0) {
               toast({ title: 'Advertencia', description: 'No se encontraron archivos en /public/BASES DE DATOS/. Si añadió archivos, necesita recompilar la aplicación.', variant: 'default' });
          }
      })
      .catch(err => {
          console.error("Failed to list files:", err);
          toast({ title: 'Error', description: 'No se pudo cargar la lista de archivos.', variant: 'destructive' });
      })
      .finally(() => {
          setIsRefreshing(false);
      });
  }, [toast]);

  useEffect(() => {
    fetchFiles();

    const interval = setInterval(() => {
      if (typeof window.XLSX !== 'undefined') {
        setXlsxLoaded(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [fetchFiles]);

 const filteredFiles = useMemo(() => {
    if (!selectedYear) return [];
    return availableFiles.filter(file => file.startsWith(`${selectedYear}/`));
  }, [selectedYear, availableFiles]);

  useEffect(() => {
    if (filteredFiles.length > 0 && !filteredFiles.includes(selectedFile)) {
      setSelectedFile(filteredFiles[0]);
    } else if (filteredFiles.length === 0) {
      setSelectedFile('');
    }
  }, [filteredFiles, selectedFile]);


 const handleProcess = async () => {
    if (!selectedFile) {
        toast({ title: 'Error', description: 'Por favor, seleccione un archivo de la lista.', variant: 'destructive' });
        return;
    }

    const parts = selectedFile.replace(/\.(xlsx|json)$/i, '').split('/');
    if (parts.length < 2) {
      toast({ title: 'Error de formato', description: 'El nombre del archivo no tiene el formato esperado "AÑO/MES.json"', variant: 'destructive' });
      return;
    }

    const year = parseInt(parts[0], 10);
    const monthName = parts[1].toUpperCase();
    const monthMap: { [key: string]: number } = {
        ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
        JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12
    };
    const month = monthMap[monthName];

    if (isNaN(year) || !month) {
        toast({ title: 'Error de formato', description: 'No se pudo extraer el mes y el año del nombre del archivo.', variant: 'destructive' });
        return;
    }

    setYearForPdf(year);
    setMonthForPdf(month);
    setIsProcessing(true);
    setProgress(5);
    setStatus('Descargando archivo de datos...');

    try {
      const response = await fetch(`/BASES DE DATOS/${selectedFile}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${response.status})`);

      setProgress(10);
      setStatus('Leyendo datos...');
      const jsonData = await response.json();
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];

      const result = await processRawData(
        { headers, rows },
        year,
        month,
        (pct, statusMsg) => {
          setProgress(pct);
          setStatus(statusMsg);
        }
      );

      setLastResults(result);
      setSelectedDepartment('all');
      setSelectedMunicipio('all');
      setSelectedIps('all');
      setStatus('Completado.');
      setProgress(100);
      toast({ title: 'Éxito', description: 'El archivo ha sido procesado correctamente.' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error procesando archivo', description: err?.message || String(err), variant: 'destructive' });
      setStatus('Error.');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const getInasistentesData = useCallback((
    relevantRows: any[][],
    headerMap: HeaderMap
  ) => {
    if (lastResults?.R.FALTANTES_ENCABEZADOS.includes('FECHA DE LA ULTIMA TOMA DE PRESION ARTERIAL REPORTADO EN HISTORIA CLINICA')) {
        return [];
    }

    const range6m = {
        start: new Date(yearForPdf, monthForPdf - 6, 1),
        end: new Date(yearForPdf, monthForPdf, 0)
    };

    return relevantRows.filter(row => {
        const fpa_val = row[headerMap['fecha_pa_last']];
        if (!fpa_val) return false;
        
        let fpa: Date | null = null;
        if (typeof fpa_val === 'number') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            fpa = new Date(excelEpoch.getTime() + (fpa_val - (fpa_val > 60 ? 1 : 0)) * 86400000);
        } else if (fpa_val instanceof Date) {
            fpa = fpa_val;
        } else if (typeof fpa_val === 'string') {
            const isoMatch = fpa_val.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
               const [_, y, m, d] = isoMatch;
               fpa = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
            } else {
               const commonMatch = fpa_val.match(/^(?:(\d{1,2})[.\/-])?(\d{1,2})[.\/-](\d{2,4})$/);
               if (commonMatch) {
                   let [_, p1, p2, p3] = commonMatch;
                   let yearNum = Number(p3);
                   if (p3.length <= 2) yearNum += 2000;
                   if (Number(p1) > 0 && Number(p1) <= 31 && Number(p2) > 0 && Number(p2) <= 12) {
                       fpa = new Date(Date.UTC(yearNum, Number(p2) - 1, Number(p1)));
                   } else if (Number(p2) > 0 && Number(p2) <= 31 && Number(p1) > 0 && Number(p1) <= 12) {
                       fpa = new Date(Date.UTC(yearNum, Number(p1) - 1, Number(p2)));
                   }
               }
            }
        }

        if (fpa && fpa instanceof Date && !isNaN(fpa.getTime())) {
            const isInRange = fpa.getTime() >= range6m.start.getTime() && fpa.getTime() <= range6m.end.getTime();
            return !isInRange;
        }
        return false;
    }).map(row => ({
        tipo_id: row[headerMap['tipo_id']] || '',
        id: row[headerMap['id']] || '',
        p_nombre: row[headerMap['p_nombre']] || '',
        s_nombre: row[headerMap['s_nombre']] || '',
        p_apellido: row[headerMap['p_apellido']] || '',
        s_apellido: row[headerMap['s_apellido']] || '',
        tel: row[headerMap['tel']] || '',
        dir: row[headerMap['dir']] || '',
    }));
  }, [yearForPdf, monthForPdf, lastResults?.R.FALTANTES_ENCABEZADOS]);

 const mapToInformeDatos = useCallback((
    resultsForPdf: DataProcessingResult,
    targetIps: string | undefined,
    targetMunicipio: string | undefined,
    includePatientLists: boolean
  ): InformeDatos => {
    const { R, rawRows, headerMap, groupedData } = resultsForPdf;
    const analysisDate = new Date();

    const MONTHS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                    'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const monthName = MONTHS[monthForPdf - 1];

    // Rangos de fecha para textos
    const endDate  = new Date(yearForPdf, monthForPdf - 1, 1);
    const start12  = new Date(yearForPdf, monthForPdf - 12, 1);
    const start6   = new Date(yearForPdf, monthForPdf - 6, 1);
    const range12  = `${MONTHS[start12.getMonth()]} ${start12.getFullYear()} – ${MONTHS[endDate.getMonth()]} ${endDate.getFullYear()}`;
    const range6   = `${MONTHS[start6.getMonth()]} ${start6.getFullYear()} – ${MONTHS[endDate.getMonth()]} ${endDate.getFullYear()}`;

    const fmtPct = (n: number, d: number) => d > 0 ? `${(n / d * 100).toFixed(1)}%` : 'N/A';

    // Calcular prevalencia
    const pop   = R.DENOMINADOR_HTA_MENORES;
    const htaEst  = Math.round(pop * 0.228);
    const htaMeta = Math.round(pop * 0.1626);
    const dmEst   = Math.round(pop * 0.035);
    const dmMeta  = Math.round(dmEst * 0.60);

    // Determinar dpto para fila de tabla
    const matchGroup = groupedData.find(g =>
      (!targetIps || g.keys.ips === targetIps) &&
      (!targetMunicipio || g.keys.municipio === targetMunicipio)
    );
    const dpto = matchGroup?.keys.dpto || '';

    // Construir filas de tablas (una por IPS, o todas si consolidado)
    const buildRows = (g: typeof groupedData[0]) => {
      const gR = g.results;
      const gPop = gR.DENOMINADOR_HTA_MENORES;
      const gHtaEst  = Math.round(gPop * 0.228);
      const gHtaMeta = Math.round(gPop * 0.1626);
      const gDmEst   = Math.round(gPop * 0.035);
      const gDmMeta  = Math.round(gDmEst * 0.60);
      return {
        captHTA: {
          dpto: g.keys.dpto, municipio: g.keys.municipio, ips: g.keys.ips, poblacion: gPop,
          htaEst: gHtaEst, htaMeta: gHtaMeta, htaCasos: gR.NUMERADOR_HTA,
          htaPctMeta: fmtPct(gR.NUMERADOR_HTA, gHtaMeta),
          htaPctPrev: fmtPct(gR.NUMERADOR_HTA, gPop),
        },
        captDM: {
          dpto: g.keys.dpto, municipio: g.keys.municipio, ips: g.keys.ips, poblacion: gPop,
          dmEst: gDmEst, dmMeta: gDmMeta, dmCasos: gR.NUMERADOR_DM,
          dmPctMeta: fmtPct(gR.NUMERADOR_DM, gDmMeta),
          dmPctPrev: fmtPct(gR.NUMERADOR_DM, gPop),
        },
        htaMM: {
          dpto: g.keys.dpto, municipio: g.keys.municipio, ips: g.keys.ips, poblacion: gPop,
          may60Denom: gR.DENOMINADOR_HTA_MAYORES, may60Num: gR.NUMERADOR_HTA_MAYORES,
          may60Pct: fmtPct(gR.NUMERADOR_HTA_MAYORES, gR.DENOMINADOR_HTA_MAYORES),
          men60Denom: gR.DENOMINADOR_HTA_MENORES_ARCHIVO, men60Num: gR.NUMERADOR_HTA_MENORES,
          men60Pct: fmtPct(gR.NUMERADOR_HTA_MENORES, gR.DENOMINADOR_HTA_MENORES_ARCHIVO),
        },
        dmCtrl: {
          dpto: g.keys.dpto, municipio: g.keys.municipio, ips: g.keys.ips, poblacion: gPop,
          denom: gR.DENOMINADOR_DM_CONTROLADOS, num: gR.NUMERADOR_DM_CONTROLADOS,
          pct: fmtPct(gR.NUMERADOR_DM_CONTROLADOS, gR.DENOMINADOR_DM_CONTROLADOS),
        },
        lab: {
          dpto: g.keys.dpto, municipio: g.keys.municipio, ips: g.keys.ips, poblacion: gPop,
          creatDenom: gR.DENOMINADOR_CREATININA, creatNum: gR.NUMERADOR_CREATININA,
          creatPct: fmtPct(gR.NUMERADOR_CREATININA, gR.DENOMINADOR_CREATININA),
          hba1cDenom: gR.DENOMINADOR_DM_CONTROLADOS, hba1cNum: gR.NUMERADOR_HBA1C,
          hba1cPct: fmtPct(gR.NUMERADOR_HBA1C, gR.DENOMINADOR_DM_CONTROLADOS),
          microalbDenom: gR.DENOMINADOR_CREATININA, microalbNum: gR.NUMERADOR_MICROALBUMINURIA,
          microalbPct: fmtPct(gR.NUMERADOR_MICROALBUMINURIA, gR.DENOMINADOR_CREATININA),
        },
      };
    };

    const sourceGroups = (targetIps && targetMunicipio)
      ? groupedData.filter(g => g.keys.ips === targetIps && g.keys.municipio === targetMunicipio)
      : groupedData;

    const rows = sourceGroups.map(buildRows);

    // Análisis narrativo generado dinámicamente
    const may60Pct = fmtPct(R.NUMERADOR_HTA_MAYORES, R.DENOMINADOR_HTA_MAYORES);
    const men60Pct = fmtPct(R.NUMERADOR_HTA_MENORES, R.DENOMINADOR_HTA_MENORES_ARCHIVO);
    const may60NC  = R.DENOMINADOR_HTA_MAYORES - R.NUMERADOR_HTA_MAYORES;
    const men60NC  = R.DENOMINADOR_HTA_MENORES_ARCHIVO - R.NUMERADOR_HTA_MENORES;
    const analisisComportamiento = [
      `Control HTA ≥60 años: ${may60Pct} (${R.NUMERADOR_HTA_MAYORES} controlados de ${R.DENOMINADOR_HTA_MAYORES}). ` +
        (may60NC > 0 ? `${may60NC} usuario(s) no controlado(s) con riesgo cardiovascular aumentado.` : 'Cumplimiento óptimo.'),
      `Control HTA <60 años: ${men60Pct} (${R.NUMERADOR_HTA_MENORES} controlados de ${R.DENOMINADOR_HTA_MENORES_ARCHIVO}). ` +
        (men60NC > 0 ? `${men60NC} paciente(s) no controlado(s); se recomienda refuerzo de seguimiento.` : 'Cumplimiento óptimo.'),
      `Diabéticos controlados: ${fmtPct(R.NUMERADOR_DM_CONTROLADOS, R.DENOMINADOR_DM_CONTROLADOS)} ` +
        `(${R.NUMERADOR_DM_CONTROLADOS} de ${R.DENOMINADOR_DM_CONTROLADOS} con HbA1c < 7%).`,
    ];

    // Listas de pacientes
    let inasistentes: InformeDatos['inasistentes'] = [];
    let sinEstadificar: InformeDatos['sinEstadificar'] = [];

    if (includePatientLists && rawRows.length > 0) {
      const relevantRows = (targetIps && targetMunicipio)
        ? rawRows.filter(row =>
            String(row[headerMap['ips']] ?? '').toUpperCase().trim() === targetIps &&
            String(row[headerMap['municipio']] ?? '').toUpperCase().trim() === targetMunicipio
          )
        : rawRows;

      // Inasistentes
      if (!R.FALTANTES_ENCABEZADOS?.includes('FECHA DE LA ULTIMA TOMA DE PRESION ARTERIAL REPORTADO EN HISTORIA CLINICA')) {
        inasistentes = getInasistentesData(relevantRows, headerMap);
      }

      // Sin estadificar
      const idxEstadio = headerMap['estadio_tfg'];
      if (idxEstadio !== undefined && idxEstadio >= 0) {
        sinEstadificar = relevantRows
          .filter(row => {
            const val = row[idxEstadio];
            return val == null || String(val).trim() === '';
          })
          .map(row => ({
            tipo_id:   String(row[headerMap['tipo_id']] ?? ''),
            id:        String(row[headerMap['id']] ?? ''),
            p_nombre:  String(row[headerMap['p_nombre']] ?? ''),
            s_nombre:  String(row[headerMap['s_nombre']] ?? ''),
            p_apellido: String(row[headerMap['p_apellido']] ?? ''),
            s_apellido: String(row[headerMap['s_apellido']] ?? ''),
          }));
      }
    }

    return {
      encabezado: {
        proceso: 'Dirección del Riesgo en Salud',
        formato: 'Evaluación de indicadores de Enfermedades Precursoras HTA y DM (DR-PP-F-06 v01)',
        entidad: `${targetIps || 'Consolidado'} – ${targetMunicipio || 'Todos los municipios'}`,
        vigencia: `01/01/${yearForPdf} – 31/12/${yearForPdf}`,
        lugarFecha: `Valledupar, ${analysisDate.toLocaleDateString('es-ES')}`,
      },
      corte: { month: monthForPdf, year: yearForPdf, monthName },
      prevalencia: {
        poblacion1869: pop, htaEstimados: htaEst, htaMeta, dmEstimados: dmEst, dmMeta,
        htaReportados: R.NUMERADOR_HTA, dmReportados: R.NUMERADOR_DM,
      },
      analisisData: {
        totalPacientes: R.TOTAL_FILAS,
        soloHta: (R as any).SOLO_HTA ?? 0,
        soloDm:  (R as any).SOLO_DM  ?? 0,
        htaDm:   (R as any).HTA_DM   ?? 0,
        estadificados: R.TFG_TOTAL,
        sinEstadificarCount: R.TOTAL_FILAS - R.TFG_TOTAL,
      },
      kpisTFG: {
        E1: R.TFG_E1, E2: R.TFG_E2, E3: R.TFG_E3, E4: R.TFG_E4, E5: R.TFG_E5,
        total: R.TFG_TOTAL,
        sinEstadificar: R.TOTAL_FILAS - R.TFG_TOTAL,
      },
      cumplimientos: {
        creatDenom: R.DENOMINADOR_CREATININA, creatNum: R.NUMERADOR_CREATININA, range12,
        hba1cDenom: R.DENOMINADOR_DM_CONTROLADOS, hba1cNum: R.NUMERADOR_HBA1C, range6,
        microalbDenom: R.DENOMINADOR_CREATININA, microalbNum: R.NUMERADOR_MICROALBUMINURIA,
        inasistentesCount: R.NUMERADOR_INASISTENTE,
      },
      tablas: {
        captacionHTA: rows.map(r => r.captHTA),
        captacionDM:  rows.map(r => r.captDM),
        htaMayoresMenores: rows.map(r => r.htaMM),
        dmControlados: rows.map(r => r.dmCtrl),
        laboratorios:  rows.map(r => r.lab),
      },
      analisisComportamiento,
      calidadDato: [
        'Verificar celdas vacías en columnas de laboratorios (creatinina, HbA1c, microalbuminuria).',
        'Actualizar fechas de laboratorios con resultados pendientes.',
        'Actualizar datos de contacto (dirección y teléfono) para facilitar la búsqueda activa.',
        'Garantizar la clasificación diagnóstica completa (DM tipo 1 vs tipo 2).',
      ],
      observaciones: [
        `Captación HTA vs meta: ${fmtPct(R.NUMERADOR_HTA, htaMeta)}`,
        `Captación DM vs meta: ${fmtPct(R.NUMERADOR_DM, dmMeta)}`,
        `Control HTA ≥60 años: ${fmtPct(R.NUMERADOR_HTA_MAYORES, R.DENOMINADOR_HTA_MAYORES)}`,
        `Control HTA <60 años: ${fmtPct(R.NUMERADOR_HTA_MENORES, R.DENOMINADOR_HTA_MENORES_ARCHIVO)}`,
        `Diabéticos controlados: ${fmtPct(R.NUMERADOR_DM_CONTROLADOS, R.DENOMINADOR_DM_CONTROLADOS)}`,
        `Tamizaje Creatinina: ${fmtPct(R.NUMERADOR_CREATININA, R.DENOMINADOR_CREATININA)}`,
        `Tamizaje HbA1c: ${fmtPct(R.NUMERADOR_HBA1C, R.DENOMINADOR_DM_CONTROLADOS)}`,
        `Tamizaje Microalbuminuria: ${fmtPct(R.NUMERADOR_MICROALBUMINURIA, R.DENOMINADOR_CREATININA)}`,
        `Inasistentes a control: ${R.NUMERADOR_INASISTENTE} usuarios`,
        ...(R.TOTAL_FILAS - R.TFG_TOTAL > 0
          ? [`Pendientes por estadificar TFG: ${R.TOTAL_FILAS - R.TFG_TOTAL} pacientes`]
          : []),
      ],
      compromisos: [
        'Garantizar tamización anual de creatinina al 100% de pacientes inscritos.',
        'Asegurar HbA1c cada 3–6 meses en pacientes con diagnóstico de DM.',
        'Realizar seguimiento oportuno a pacientes inasistentes (búsqueda activa).',
        'Fortalecer la búsqueda de pacientes pendientes por estadificación TFG.',
        'Intensificar tamizaje poblacional en personas de 18 a 69 años.',
        'Garantizar consultas de psicología, nutrición y medicina interna según estadio renal.',
        'Mantener actualizado el diligenciamiento de la base de datos.',
      ],
      inasistentes,
      sinEstadificar,
    };
  }, [getInasistentesData, yearForPdf, monthForPdf]);



 const handleBulkGeneratePdf = async () => {
    if (!lastResults) {
      toast({ title: 'Error', description: 'Primero procese un archivo.', variant: 'destructive' });
      return;
    }
    setIsGeneratingPdf(true);
    setPdfProgress(null);

    const zip = new JSZip();
    const monthName = new Date(yearForPdf, monthForPdf - 1).toLocaleString('es', { month: 'long' });
    const hm = lastResults.headerMap;

    try {
      // ── A. Cargar pdfMake e imagen UNA SOLA VEZ ──────────────────────────
      const [pdfMakeModule, pdfFontsModule, backgroundImg] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts'),
        loadImageAsBase64('/imagenes pdf/IMAGENEN UNIFICADA.jpg'),
      ]);
      const pdfMake = pdfMakeModule.default;
      pdfMake.vfs = pdfFontsModule.default;
      const images: PdfImages = { background: backgroundImg };

      // ── B. Índice de filas por IPS|Municipio — construido UNA SOLA VEZ O(n) ─
      // Evita filtrar 10K filas por cada IPS en el bucle (era O(n × k))
      const rowIndex = new Map<string, any[][]>();
      for (const row of lastResults.rawRows) {
        const key = `${String(row[hm['ips']] ?? '').toUpperCase().trim()}|${String(row[hm['municipio']] ?? '').toUpperCase().trim()}`;
        if (!rowIndex.has(key)) rowIndex.set(key, []);
        rowIndex.get(key)!.push(row);
      }

      // ── C. Lista única de IPS/Municipio ─────────────────────────────────
      const uniqueGroups = [...new Map(
        lastResults.groupedData.map(g => [`${g.keys.ips}|${g.keys.municipio}`, g])
      ).values()];
      const total = uniqueGroups.length;
      setPdfProgress({ done: 0, total });

      // ── D. Pre-calcular TODOS los docDefinitions (CPU, sin I/O) ─────────
      const tasks = uniqueGroups.map(group => {
        const { ips, municipio } = group.keys;
        const resultsForPdf: DataProcessingResult = {
          ...lastResults,
          R: { ...group.results, TOTAL_FILAS: group.rowCount, FALTANTES_ENCABEZADOS: lastResults.R.FALTANTES_ENCABEZADOS },
          rawRows: rowIndex.get(`${ips}|${municipio}`) ?? [],   // ya filtrado
          headerMap: hm,
        };
        const reportData  = mapToInformeDatos(resultsForPdf, ips, municipio, true);
        const docDef      = buildDocDefinition(reportData, images);
        const safeIps     = ips.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '_');
        const safeMun     = municipio.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/g, '_');
        const fileName    = `Informe_${safeIps}_${safeMun}.pdf`;
        return { docDef, fileName };
      });

      // ── E. Renderizar en lotes de 5 en paralelo ──────────────────────────
      const BATCH = 5;
      let done = 0;
      for (let i = 0; i < tasks.length; i += BATCH) {
        const batch = tasks.slice(i, i + BATCH);
        await Promise.all(
          batch.map(({ docDef, fileName }) =>
            new Promise<void>(resolve => {
              pdfMake.createPdf(docDef).getBlob(blob => {
                zip.file(fileName, blob);
                resolve();
              });
            })
          )
        );
        done += batch.length;
        setPdfProgress({ done, total });
        // Ceder el hilo al navegador entre lotes para evitar freeze
        await new Promise(r => setTimeout(r, 0));
      }

      // ── F. Comprimir y descargar (nivel 1 = rápido) ──────────────────────
      setPdfProgress({ done: total, total });
      const zipBlob = await zip.generateAsync({
        type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 },
      });
      const url = URL.createObjectURL(zipBlob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `Informes_Masivos_${monthName}_${yearForPdf}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: '✅ Descarga iniciada', description: `${total} PDFs generados correctamente.` });

    } catch (error: any) {
      console.error('Error generando ZIP:', error);
      toast({ title: 'Error', description: error?.message || 'No se pudo generar el archivo ZIP.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(null);
    }
  };


  const exportResults = () => {
    if (!lastResults) { 
        toast({ title: 'Error', description: 'Primero procese un archivo.', variant: 'destructive' });
        return;
    }
    const { R, issues, groupedData } = lastResults;

    if (!xlsxLoaded) {
        toast({ title: 'Error', description: 'La librería de exportación (XLSX) no está cargada. Por favor espere.', variant: 'destructive' });
        return;
    }
    
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();

    const summaryData = groupedData.map(g => {
        const poblacionHTA = g.results.DENOMINADOR_HTA_MENORES;
        const poblacionDM = g.results.POBLACION_DM_TOTAL;
        const denominadorDM = g.results.DENOMINADOR_DM_CONTROLADOS;
        const resultadoHTA = poblacionHTA > 0 ? g.results.NUMERADOR_HTA / poblacionHTA : 0;
        const resultadoMenores = g.results.DENOMINADOR_HTA_MENORES_ARCHIVO > 0 ? g.results.NUMERADOR_HTA_MENORES / g.results.DENOMINADOR_HTA_MENORES_ARCHIVO : 0;
        const resultadoMayores = g.results.DENOMINADOR_HTA_MAYORES > 0 ? g.results.NUMERADOR_HTA_MAYORES / g.results.DENOMINADOR_HTA_MAYORES : 0;
        const resultadoDM = denominadorDM > 0 ? g.results.NUMERADOR_DM_CONTROLADOS / denominadorDM : 0;
        const resultadoCreatinina = g.results.DENOMINADOR_CREATININA > 0 ? g.results.NUMERADOR_CREATININA / g.results.DENOMINADOR_CREATININA : 0;

        return {
            'DEPARTAMENTO DE RESIDENCIA': g.keys.dpto,
            'MUNICIPIO DE RESIDENCIA': g.keys.municipio,
            'NOMBRE DE LA IPS QUE HACE SEGUIMIENTO': g.keys.ips,
            'Numerador_HTA': g.results.NUMERADOR_HTA,
            'Poblacion_HTA': poblacionHTA,
            'RESULTADO HTA': resultadoHTA,
            'NUMERADOR_HTA_MENORES': g.results.NUMERADOR_HTA_MENORES,
            'DENOMINADOR_HTA_MENORES (ARCHIVO)': g.results.DENOMINADOR_HTA_MENORES_ARCHIVO, 
            '% MENORES': resultadoMenores,
            'NUMERADOR_HTA_MAYORES': g.results.NUMERADOR_HTA_MAYORES,
            'DENOMINADOR_HTA_MAYORES': g.results.DENOMINADOR_HTA_MAYORES,
            '% MAYORES': resultadoMayores,
            'NUMERADOR_DM': g.results.NUMERADOR_DM,
            'Poblacion_DM': poblacionDM,
            'RESULTADO_DM': resultadoDM,
            'NUMERADOR_DM_CONTROLADOS': g.results.NUMERADOR_DM_CONTROLADOS,
            'DENOMINADOR_DM_CONTROLADOS': denominadorDM,
            '%_DM_CONTROLADOS': resultadoDM,
            'NUMERADOR_CREATININA': g.results.NUMERADOR_CREATININA,
            'DENOMINADOR_CREATININA': g.results.DENOMINADOR_CREATINina,
            '%_CREATININA': resultadoCreatinina,
        };
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen KPIs Agrupado');


    const kpiData = Object.entries(R).map(([k, v]) => ({ Indicador: k, Valor: Array.isArray(v) ? v.join(', ') : v }));
    const wsKPI = XLSX.utils.json_to_sheet(kpiData, {header: ["Indicador", "Valor"]});
    XLSX.utils.book_append_sheet(wb, wsKPI, 'KPIs Totales');
    
    if(issues.dates.length > 0) {
      const wsF = XLSX.utils.aoa_to_sheet([['Fila', 'Campo', 'Valor original', 'Observación'], ...issues.dates]);
      XLSX.utils.book_append_sheet(wb, wsF, 'Fechas dudosas');
    }
    if(issues.nums.length > 0) {
      const wsN = XLSX.utils.aoa_to_sheet([['Fila', 'Campo', 'Valor', 'Observación'], ...issues.nums]);
      XLSX.utils.book_append_sheet(wb, wsN, 'Num inválidos');
    }
    if(issues.cats.length > 0) {
      const wsC = XLSX.utils.aoa_to_sheet([['Fila', 'Campo', 'Valor', 'Esperado'], ...issues.cats]);
      XLSX.utils.book_append_sheet(wb, wsC, 'Cats inesperados');
    }

    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'resultados_indicadores.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    setIsExportPreviewOpen(false);
  }

  const formatPercent = (value: number) => {
    if (value === 0) return '0%';
    if (!value || !Number.isFinite(value)) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  }

  const { departments, municipios, ips, filteredGroupedData } = useMemo(() => {
    if (!lastResults) return { departments: [], municipios: [], ips: [], filteredGroupedData: [] };

    let allDepartments = [...new Set(lastResults.groupedData.map(g => g.keys.dpto))].sort();
    if (selectedFile?.toUpperCase().includes('SEPTIEMBRE')) {
        allDepartments = allDepartments.filter(d => d !== 'DEPARTAMENTO DE RESIDENCIA' && d !== 'N/A' && ['CESAR', 'LA GUAJIRA', 'MAGDALENA'].includes(d));
    }

    const byDepartment = selectedDepartment === 'all'
      ? lastResults.groupedData
      : lastResults.groupedData.filter(g => g.keys.dpto === selectedDepartment);

    const allMunicipios = [...new Set(byDepartment.map(g => g.keys.municipio))].sort();

    const byMunicipio = selectedMunicipio === 'all'
      ? byDepartment
      : byDepartment.filter(g => g.keys.municipio === selectedMunicipio);

    const allIps = [...new Set(byMunicipio.map(g => g.keys.ips))].sort();

    const byIps = selectedIps === 'all'
        ? byMunicipio
        : byMunicipio.filter(g => g.keys.ips === selectedIps);

    return { departments: allDepartments, municipios: allMunicipios, ips: allIps, filteredGroupedData: byIps };
  }, [lastResults, selectedDepartment, selectedMunicipio, selectedIps, selectedFile]);


  useEffect(() => {
    if(selectedDepartment === 'all') {
      setSelectedMunicipio('all');
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedMunicipio === 'all') {
        setSelectedIps('all');
    }
  }, [selectedMunicipio]);


  const kpis = useMemo(() => {
    if (!lastResults) return null;
    
    if (selectedDepartment === 'all' && selectedMunicipio === 'all' && selectedIps === 'all') {
        return lastResults.R;
    }

    const initialKpis: KpiResults & { TOTAL_FILAS: number } = {
        NUMERADOR_HTA: 0, NUMERADOR_HTA_MAYORES: 0, DENOMINADOR_HTA_MAYORES: 0, NUMERADOR_DM_CONTROLADOS: 0,
        DENOMINADOR_DM_CONTROLADOS: 0, POBLACION_DM_TOTAL: 0, NUMERADOR_DM: 0, NUMERADOR_HTA_MENORES: 0,
        DENOMINADOR_HTA_MENORES: 0, DENOMINADOR_HTA_MENORES_ARCHIVO: 0, NUMERADOR_CREATININA: 0,
        DENOMINADOR_CREATININA: 0, NUMERADOR_HBA1C: 0, NUMERADOR_MICROALBUMINURIA: 0, NUMERADOR_INASISTENTE: 0,
        TFG_E1: 0, TFG_E2: 0, TFG_E3: 0, TFG_E4: 0, TFG_E5: 0, TFG_TOTAL: 0, TOTAL_FILAS: 0,
    };

    return filteredGroupedData.reduce((acc, group) => {
        Object.keys(group.results).forEach(keyStr => {
            const key = keyStr as keyof KpiResults;
            (acc as any)[key] = ((acc as any)[key] || 0) + (group.results[key] || 0);
        });
        acc.TOTAL_FILAS += group.rowCount;
        return acc;
    }, initialKpis as any);

  }, [lastResults, filteredGroupedData, selectedDepartment, selectedMunicipio, selectedIps]);
  
  const handleClearResults = () => {
    setLastResults(null);
    setStatus('Listo para procesar.');
    setProgress(0);
  };
  
    const exportPreviewData = useMemo(() => {
        if (!lastResults) return [];
        return lastResults.groupedData.slice(0, 5).map(g => {
             const resultadoCreatinina = g.results.DENOMINADOR_CREATININA > 0 ? g.results.NUMERADOR_CREATININA / g.results.DENOMINADOR_CREATININA : 0;
             return {
                ips: g.keys.ips,
                municipio: g.keys.municipio,
                numerador: g.results.NUMERADOR_CREATININA,
                denominador: g.results.DENOMINADOR_CREATININA,
                porcentaje: formatPercent(resultadoCreatinina),
             }
        })
    }, [lastResults]);
    

  const kpiGroups = kpis ? [
    {
      title: 'Captacion de HTA',
      cards: [
        { label: 'Pacientes HTA (Numerador)', key: 'NUMERADOR_HTA', description: 'Pacientes HTA (18-69a) encontrados en el archivo.' },
        { label: 'Población HTA (Denominador)', key: 'DENOMINADOR_HTA_MENORES', description: 'Total de pacientes con diagnóstico de HTA según archivo de población.' },
        { label: 'Resultado HTA', key: 'RESULTADO_HTA', isPercentage: true, value: formatPercent(kpis.DENOMINADOR_HTA_MENORES > 0 ? kpis.NUMERADOR_HTA / kpis.DENOMINADOR_HTA_MENORES : 0), description: '(Numerador HTA / Población HTA)' },
      ]
    },
    {
      title: 'Control HTA &lt; 60 años',
      cards: [
        { label: 'HTA Controlado &lt;60 (Numerador)', key: 'NUMERADOR_HTA_MENORES', description: 'Pacientes HTA (18-59a) con PA &lt; 140/90.' },
        { label: 'Población HTA &lt;60 (Denominador)', key: 'DENOMINADOR_HTA_MENORES_ARCHIVO', description: 'Pacientes HTA (18-59a) del archivo cargado.' },
        { label: 'Resultado HTA &lt;60', key: 'RESULTADO_HTA_MENORES', isPercentage: true, value: formatPercent(kpis.DENOMINADOR_HTA_MENORES_ARCHIVO > 0 ? kpis.NUMERADOR_HTA_MENORES / kpis.DENOMINADOR_HTA_MENORES_ARCHIVO : 0), description: '(Numerador / Denominador)' },
      ]
    },
    {
      title: 'Control HTA &gt;= 60 años',
      cards: [
        { label: 'HTA Controlado &gt;=60 (Numerador)', key: 'NUMERADOR_HTA_MAYORES', description: 'Pacientes HTA (&gt;=60a, sin DM) con PA &lt; 150/90.' },
        { label: 'Población HTA &gt;=60 (Denominador)', key: 'DENOMINADOR_HTA_MAYORES', description: 'Pacientes HTA (&gt;=60a, sin DM) del archivo cargado.' },
        { label: 'Resultado HTA &gt;=60', key: 'RESULTADO_HTA_MAORIES', isPercentage: true, value: formatPercent(kpis.DENOMINADOR_HTA_MAYORES > 0 ? kpis.NUMERADOR_HTA_MAYORES / kpis.DENOMINADOR_HTA_MAYORES : 0), description: '(Numerador / Denominador)' },
      ]
    },
     {
      title: 'Captación de Diabetes Mellitus',
      cards: [
        { label: 'Pacientes DM Archivo (Numerador)', key: 'NUMERADOR_DM', description: 'Total pacientes DM (18-69a) encontrados en el archivo.' },
        { label: 'Población DM Total (Denominador)', key: 'POBLACION_DM_TOTAL', description: 'Total de pacientes con diagnóstico de DM según archivo de población.' },
        { label: 'Resultado Adherencia DM', key: 'RESULTADO_DM_POB', isPercentage: true, value: formatPercent(kpis.POBLACION_DM_TOTAL > 0 ? kpis.NUMERADOR_DM / kpis.POBLACION_DM_TOTAL : 0), description: '(Numerador / Denominador)' },
      ]
    },
    {
      title: 'Diabéticos Controlados',
      cards: [
        { label: 'DM Controlado (Numerador)', key: 'NUMERADOR_DM_CONTROLADOS', description: 'Pacientes DM con HbA1c &lt; 7%.' },
        { label: 'Pacientes con DM (Denominador)', key: 'DENOMINADOR_DM_CONTROLADOS', description: 'Pacientes con DX de DM="SI" en el archivo cargado.' },
        { label: 'Resultado Control DM', key: 'RESULTADO_DM_CONTROL', isPercentage: true, value: formatPercent(kpis.DENOMINADOR_DM_CONTROLADOS > 0 ? kpis.NUMERADOR_DM_CONTROLADOS / kpis.DENOMINADOR_DM_CONTROLADOS : 0), description: '(Numerador / Denominador)' },
      ]
    },
    {
      title: 'Realización de Creatinina en el último año',
      cards: [
        { label: 'Creatinina Tomada (Numerador)', key: 'NUMERADOR_CREATININA', description: 'Pacientes con creatinina en últimos 12 meses.' },
        { label: 'Denominador Creatinina', key: 'DENOMINADOR_CREATININA', description: 'Total de registros con fecha de creatinina.' },
        { 
          label: 'Resultado Creatinina', 
          key: 'RESULTADO_CREATININA',
          isPercentage: true, 
          value: formatPercent(kpis.DENOMINADOR_CREATININA > 0 ? kpis.NUMERADOR_CREATININA / kpis.DENOMINADOR_CREATININA : 0),
          description: '(Numerador / Denominador)' 
        },
      ]
    },
    {
        title: 'Inasistentes a Control',
        cards: [
            { label: 'Inasistentes a Control', key: 'NUMERADOR_INASISTENTE', description: 'Pacientes con fecha de PA registrada pero fuera de los últimos 6 meses.' },
            { label: 'Total Filas Leídas', key: 'TOTAL_FILAS', description: 'Número total de registros en el archivo.' },
            { 
                label: 'Resultado Inasistentes', 
                key: 'RESULTADO_INASISTENTES',
                isPercentage: true, 
                value: formatPercent(kpis.TOTAL_FILAS > 0 ? kpis.NUMERADOR_INASISTENTE / kpis.TOTAL_FILAS : 0),
                description: '(Inasistentes / Total Filas)' 
            },
        ]
    }
  ] : [];

  const otherKpis = kpis ? [
    { label: 'HbA1c Tomada (DM)', key: 'NUMERADOR_HBA1C', description: 'Pacientes DM con HbA1c en últimos 6 meses.' },
    { label: 'Microalbuminuria Tomada (DM)', key: 'NUMERADOR_MICROALBUMINURIA', description: 'Pacientes DM con microalbuminuria en últimos 12 meses.' },
  ] : [];

  const tfgKpis = kpis ? [
    { label: 'Estadio 1', key: 'TFG_E1', description: 'Pacientes en Estadio 1 (TFG &gt;= 90)' },
    { label: 'Estadio 2', key: 'TFG_E2', description: 'Pacientes en Estadio 2 (TFG 60-89)' },
    { label: 'Estadio 3', key: 'TFG_E3', description: 'Pacientes en Estadio 3 (TFG 30-59)' },
    { label: 'Estadio 4', key: 'TFG_E4', description: 'Pacientes en Estadio 4 (TFG 15-29)' },
    { label: 'Estadio 5', key: 'TFG_E5', description: 'Pacientes en Estadio 5 (TFG &lt; 15)' },
    { label: 'Total con Estadio', key: 'TFG_TOTAL', description: 'Total pacientes con estadio TFG informado.' },
  ] : [];


  const issues = lastResults?.issues || { dates: [], nums: [], cats: [] };

  const chartDataHTA = kpis ? [
    { name: 'HTA General', Numerador: kpis.NUMERADOR_HTA, Denominador: kpis.DENOMINADOR_HTA_MENORES },
    { name: 'HTA &lt;60', Numerador: kpis.NUMERADOR_HTA_MENORES, Denominador: kpis.DENOMINADOR_HTA_MENORES_ARCHIVO },
    { name: 'HTA &gt;=60', Numerador: kpis.NUMERADOR_HTA_MAYORES, Denominador: kpis.DENOMINADOR_HTA_MAYORES },
  ] : [];

  const chartDataDM = kpis ? [
      { name: 'Adherencia DM', Numerador: kpis.NUMERADOR_DM, Denominador: kpis.POBLACION_DM_TOTAL },
      { name: 'Control DM (HbA1c)', Numerador: kpis.NUMERADOR_DM_CONTROLADOS, Denominador: kpis.DENOMINADOR_DM_CONTROLADOS },
  ] : [];

  const chartDataOtros = kpis ? [
      { name: 'Creatinina Tomada', Numerador: kpis.NUMERADOR_CREATININA, Denominador: kpis.DENOMINADOR_CREATININA },
      { name: 'HbA1c Tomada', Numerador: kpis.NUMERADOR_HBA1C, Denominador: kpis.DENOMINADOR_DM_CONTROLADOS },
      { name: 'Microalbuminuria Tomada', Numerador: kpis.NUMERADOR_MICROALBUMINURIA, Denominador: kpis.DENOMINADOR_DM_CONTROLADOS },
  ] : [];


  const chartConfig = {
    Numerador: { label: 'Numerador (Cumplen)', color: 'hsl(var(--primary))' },
    Denominador: { label: 'Denominador (Población)', color: 'hsl(var(--muted))' },
  };
  
  const uniqueIpsLocations = useMemo(() => {
    if (!lastResults) return [];
    return [...new Map(filteredGroupedData.map(item => [`${item.keys.ips}|${item.keys.municipio}`, item])).values()]
        .map(item => ({
            value: `${item.keys.ips}|${item.keys.municipio}`,
            label: `${item.keys.ips} - ${item.keys.municipio}`
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
  }, [lastResults, filteredGroupedData]);


  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
        strategy="lazyOnload"
        onLoad={() => setXlsxLoaded(true)}
      />
      <Toaster />
      <div className="min-h-screen bg-background text-foreground font-sans">
        <header className="bg-card py-4 px-6 border-b">
          <div className="container mx-auto flex items-center justify-between relative">
            <h1 className="font-bold text-primary text-2xl uppercase">INDICADORES RCV</h1>
            <Button variant="outline" asChild>
                <a href="/upload">
                    Subir y Convertir a JSON
                </a>
            </Button>
          </div>
        </header>

        <main className="container mx-auto p-4 md:p-6 grid gap-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Cargue y Configuración</CardTitle>
              <CardDescription>Seleccione el año y el archivo de datos para analizar. La población se cruzará con <code>Poblacion {selectedYear || "..."}.csv</code>.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 items-end">
                 <div className="grid gap-2">
                  <Label htmlFor="yearSelect">Año</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isProcessing}>
                    <SelectTrigger id="yearSelect">
                      <SelectValue placeholder="Seleccione un año..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.length > 0 ? (
                        availableYears.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-years" disabled>No hay años disponibles</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="fileSelect">Archivo de Datos (Mes)</Label>
                  <Select value={selectedFile} onValueChange={setSelectedFile} disabled={isProcessing || !selectedYear}>
                    <SelectTrigger id="fileSelect">
                      <SelectValue placeholder="Seleccione un archivo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredFiles.length > 0 ? (
                        filteredFiles.map(file => (
                          <SelectItem key={file} value={file}>{file.split('/')[1].replace(/\.(xlsx|json)$/i, '')}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-files" disabled>No hay archivos para este año</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 justify-self-end self-end w-full">
                  <Button onClick={handleProcess} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isProcessing || !selectedFile}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                    {isProcessing ? 'Procesando...' : 'Procesar Archivo'}</Button>
                   <Button onClick={fetchFiles} variant="outline" size="icon" className="flex-shrink-0" disabled={isRefreshing}>
                        {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="sr-only">Actualizar lista</span>
                   </Button>
                    <Button onClick={handleClearResults} variant="outline" size="icon" className="flex-shrink-0" disabled={isProcessing || !lastResults}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Limpiar Resultados</span>
                    </Button>
                </div>
              </div>

              {isProcessing && (
                <div className="mt-6 border-t pt-4">
                  <Label className="font-medium text-muted-foreground">{status}</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Progress value={progress} className="w-full h-2" />
                    <span className="font-semibold min-w-[4ch] text-right">{Math.round(progress)}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {lastResults && kpis && (
             <div className="grid gap-8">
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Resultados de Indicadores ({selectedDepartment === 'all' ? 'Consolidado' : `${selectedDepartment}${selectedMunicipio === 'all' ? '' : ` - ${selectedMunicipio}`}${selectedIps === 'all' ? '' : ` - ${selectedIps}`}`})</CardTitle>
                            <CardDescription>Resumen de los KPIs calculados para la selección actual.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                             <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="Seleccionar Depto." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los Departamentos</SelectItem>
                                    {departments.map(dpto => (
                                        <SelectItem key={dpto} value={dpto}>{dpto}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                             <Select value={selectedMunicipio} onValueChange={setSelectedMunicipio} disabled={selectedDepartment === 'all'}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="Seleccionar Municipio" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los Municipios</SelectItem>
                                    {municipios.map(muni => (
                                        <SelectItem key={muni} value={muni}>{muni}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedIps} onValueChange={setSelectedIps} disabled={selectedMunicipio === 'all'}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="Seleccionar IPSI" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las IPSI</SelectItem>
                                    {ips.map(ipsName => (
                                        <SelectItem key={ipsName} value={ipsName}>{ipsName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-8">
                        {kpiGroups.map((group, index) => (
                          <div key={index} className="space-y-4">
                            <h3 className="font-semibold text-card-foreground" dangerouslySetInnerHTML={{ __html: group.title }}></h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {group.cards.map(({ label, key, description, isPercentage, value }) => (
                                    <Card key={key || label} className="p-4 text-center flex flex-col justify-between hover:bg-card-foreground/5 transition-colors">
                                        <div>
                                           <p className="text-2xl font-bold text-primary">{isPercentage ? value : (kpis as any)[key] ?? 0}</p>
                                           <p className="font-semibold mt-1" dangerouslySetInnerHTML={{ __html: label }}></p>
                                        </div>
                                        <p className="text-muted-foreground mt-2">{description}</p>
                                    </Card>
                                ))}
                            </div>
                          </div>
                        ))}
                         <div className="border-t pt-8 space-y-4">
                            <h3 className="font-semibold text-card-foreground">Resultados TFG por Estadio</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                               {tfgKpis.map(({ label, key, description }) => (
                                    <Card key={key} className="p-4 text-center flex flex-col justify-between hover:bg-card-foreground/5 transition-colors">
                                        <div>
                                            <p className="text-2xl font-bold text-primary">{(kpis as any)[key] ?? 0}</p>
                                            <p className="font-semibold mt-1">{label}</p>
                                        </div>
                                        <p className="text-muted-foreground mt-2">{description}</p>
                                    </Card>
                               ))}
                            </div>
                        </div>
                         <div className="border-t pt-8 space-y-4">
                            <h3 className="font-semibold text-card-foreground">Otros Indicadores y Métricas</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                               {otherKpis.map(({ label, key, description, isPercentage, value }) => (
                                    <Card key={key} className="p-4 text-center flex flex-col justify-between hover:bg-card-foreground/5 transition-colors">
                                        <div>
                                            <p className="text-2xl font-bold text-primary">{isPercentage ? value : (kpis as any)[key] ?? 0}</p>
                                            <p className="font-semibold mt-1">{label}</p>
                                        </div>
                                        <p className="text-muted-foreground mt-2">{description}</p>
                                    </Card>
                               ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                  <CardHeader>
                    <CardTitle>Análisis Visual de KPIs</CardTitle>
                    <CardDescription>Comparación visual de pacientes que cumplen (numerador) vs. la población relevante (denominador) para cada indicador.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                      <div className="flex flex-col gap-2">
                        <h3 className="text-center font-medium">Indicadores HTA</h3>
                        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                          <BarChart accessibilityLayer data={chartDataHTA} layout="vertical" margin={{ left: 30, right: 20 }}>
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} width={100}/>
                            <XAxis type="number" />
                            <Tooltip cursor={{ fill: 'hsl(var(--accent) / 0.2)' }} content={<ChartTooltipContent indicator="dot" />} />
                            <Legend />
                            <Bar dataKey="Denominador" fill="var(--color-Denominador)" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="Numerador" fill="var(--color-Numerador)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ChartContainer>
                      </div>
                       <div className="flex flex-col gap-2">
                        <h3 className="text-center font-medium">Indicadores DM</h3>
                        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                          <BarChart accessibilityLayer data={chartDataDM} layout="vertical" margin={{ left: 30, right: 20 }}>
                            <CartesianGrid horizontal={false} />
                             <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} width={100}/>
                            <XAxis type="number" />
                            <Tooltip cursor={{ fill: 'hsl(var(--accent) / 0.2)' }} content={<ChartTooltipContent indicator="dot" />} />
                            <Legend />
                            <Bar dataKey="Denominador" fill="var(--color-Denominador)" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="Numerador" fill="var(--color-Numerador)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ChartContainer>
                      </div>
                      <div className="flex flex-col gap-2">
                        <h3 className="text-center font-medium">Otros Indicadores (DM)</h3>
                         <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                           <BarChart accessibilityLayer data={chartDataOtros} layout="vertical" margin={{ left: 30, right: 20 }}>
                            <CartesianGrid horizontal={false} />
                             <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} width={100}/>
                            <XAxis type="number" />
                            <Tooltip cursor={{ fill: 'hsl(var(--accent) / 0.2)' }} content={<ChartTooltipContent indicator="dot" />} />
                            <Legend />
                            <Bar dataKey="Denominador" fill="var(--color-Denominador)" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="Numerador" fill="var(--color-Numerador)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ChartContainer>
                      </div>
                  </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Observaciones y Exportación</CardTitle>
                        <CardDescription>Calidad de datos, exportación a Excel y generación de informes en PDF.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="grid gap-4">
                            <div className="grid sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                                 <Dialog open={isExportPreviewOpen} onOpenChange={setIsExportPreviewOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" disabled={isGeneratingPdf} className="mb-2 sm:mb-0 w-full sm:w-auto">
                                            <Eye className="mr-2 h-4 w-4"/>
                                            Exportar Excel
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl">
                                        <DialogHeader>
                                            <DialogTitle>Vista Previa de Exportación</DialogTitle>
                                            <DialogDescription>
                                                Esta es una vista previa de las primeras 5 filas de datos que se exportarán a Excel.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="max-h-[50vh] overflow-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>IPS</TableHead>
                                                        <TableHead>Municipio</TableHead>
                                                        <TableHead>Num. Creat.</TableHead>
                                                        <TableHead>Den. Creat.</TableHead>
                                                        <TableHead>% Creatinina</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {exportPreviewData.map((row, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{row.ips}</TableCell>
                                                            <TableCell>{row.municipio}</TableCell>
                                                            <TableCell>{row.numerador}</TableCell>
                                                            <TableCell>{row.denominador}</TableCell>
                                                            <TableCell>{row.porcentaje}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsExportPreviewOpen(false)}>Cancelar</Button>
                                            <Button onClick={exportResults}>
                                                <FileDown className="mr-2 h-4 w-4"/>
                                                Confirmar y Descargar
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Select value={selectedIpsForPdf} onValueChange={setSelectedIpsForPdf} disabled={isGeneratingPdf}>
                                    <SelectTrigger className="w-full sm:w-[280px]">
                                    <SelectValue placeholder="Seleccionar IPS para PDF" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="all">Consolidado ({selectedDepartment === 'all' ? 'Todos' : selectedDepartment})</SelectItem>
                                    {uniqueIpsLocations.map(item => (
                                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                                     <Button onClick={handleBulkGeneratePdf} variant="secondary" disabled={isGeneratingPdf} className="w-full">
                                        {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Files className="mr-2 h-4 w-4"/>}
                                        {isGeneratingPdf
                                          ? pdfProgress
                                            ? `PDF ${pdfProgress.done}/${pdfProgress.total}…`
                                            : 'Preparando…'
                                          : 'Masivo PDF'}
                                      </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
             </div>
          )}
        </main>
        
      </div>
    </>
  );
}

    
    

    

    