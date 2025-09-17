

"use client";
import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { FileUp, FileDown, Library, Loader2, FlaskConical, FileText, Files } from 'lucide-react';
import Script from 'next/script';
import { DataProcessingResult, GroupedResult, KpiResults } from '@/lib/data-processing';
import { processSelectedFile, listFiles } from '@/ai/actions';
import { generateReportText } from '@/ai/flows/report-flow';
import { AIContent } from '@/ai/schemas';
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
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string | number>('');
  const [lastResults, setLastResults] = useState<DataProcessingResult | null>(null);
  const [selectedIpsForPdf, setSelectedIpsForPdf] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');


  useEffect(() => {
    if (typeof window !== 'undefined') {
        const now = new Date();
        setSelectedMonth(String(now.getMonth() + 1));
        setSelectedYear(now.getFullYear());
    }

    listFiles().then(files => {
        setAvailableFiles(files);
        if (files.length > 0) {
            setSelectedFile(files[0]);
        } else {
             toast({ title: 'Advertencia', description: 'No se encontraron archivos .xlsx en /public/BASES DE DATOS/. Si añadió archivos, necesita recompilar la aplicación.', variant: 'default' });
        }
    }).catch(err => {
        console.error("Failed to list files:", err);
        toast({ title: 'Error', description: 'No se pudo cargar la lista de archivos desde el servidor.', variant: 'destructive' });
    });

    const interval = setInterval(() => {
      if (typeof window.XLSX !== 'undefined') {
        setXlsxLoaded(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [toast]);


 const startProcessing = (action: Promise<DataProcessingResult>) => {
    setIsProcessing(true);
    setProgress(20);
    setStatus('Procesando archivo en el servidor...');

    action.then(results => {
      setLastResults(results);
      setSelectedDepartment('all');
      setStatus('Completado.');
      setProgress(100);
      toast({ title: 'Éxito', description: 'El archivo ha sido procesado correctamente.' });
    }).catch(err => {
      console.error(err);
      toast({ title: 'Error procesando archivo', description: err?.message || String(err), variant: 'destructive' });
      setStatus('Error.');
      setProgress(0);
    }).finally(() => {
      setIsProcessing(false);
    });
 }

 const handleProcess = async () => {
    if (!selectedFile) {
        toast({ title: 'Error', description: 'Por favor, seleccione un archivo de la lista.', variant: 'destructive' });
        return;
    }
    if (!selectedYear || !selectedMonth) {
        toast({ title: 'Error', description: 'Por favor, seleccione mes y año.', variant: 'destructive' });
        return;
    }

    startProcessing(processSelectedFile(selectedFile, Number(selectedYear), Number(selectedMonth)));
  };


 const mapToInformeDatos = (
    resultsForPdf: DataProcessingResult,
    aiContent: AIContent,
    targetIps: string | undefined,
    targetMunicipio: string | undefined
  ): InformeDatos => {
    const { R: kpis } = resultsForPdf;
    const monthName = new Date(Number(selectedYear), Number(selectedMonth) - 1).toLocaleString('es', { month: 'long' });
    const analysisDate = new Date();

    const parseAIContent = (content: string): any[] => {
        if (!content) return [];
        // Expanded regex to remove more HTML tags like <b>
        const cleanContent = content.replace(/<\/?(p|ul|li|ol|strong|b)>/g, '\n').trim();
        const items = cleanContent.split('\n').map(s => s.trim()).filter(Boolean);
        return items;
    };

    return {
      encabezado: {
        proceso: 'Dirección del Riesgo en Salud',
        formato: 'Evaluación de indicadores de gestantes, hipertensos y diabéticos (código DR-PP-F-06, versión 01; emisión 18/06/2019; vigencia 02/07/2019)',
        entidad: `${targetIps || "Consolidado"} - Municipio: ${targetMunicipio || "Todos"}`,
        vigencia: `01/01/${selectedYear}–31/12/${selectedYear}`,
        lugarFecha: `Valledupar, ${analysisDate.toLocaleDateString('es-ES')}`
      },
      referencia: aiContent.reference.replace(/<p>|<\/p>/g, ''),
      analisisResumido: parseAIContent(aiContent.summary),
      datosAExtraer: [
        { label: "Población HTA (según archivo población)", valor: String(kpis.DENOMINADOR_HTA_MENORES) },
        { label: "Población DM (según archivo población)", valor: String(kpis.POBLACION_DM_TOTAL) },
        { label: "Total pacientes en data", valor: String(kpis.TOTAL_FILAS) },
        { label: `Distribución (HTA=${kpis.NUMERADOR_HTA}, DM=${kpis.NUMERADOR_DM})`, valor: "" },
        { label: "Inasistencia (por última TA)", valor: `${kpis.NUMERADOR_INASISTENTE} usuarios` },
        { label: "Tamizaje Creatinina", valor: formatPercent(kpis.DENOMINADOR_CREATININA > 0 ? kpis.NUMERADOR_CREATININA / kpis.DENOMINADOR_CREATININA : 0) },
        { label: "Tamizaje HbA1c (en DM)", valor: formatPercent(kpis.DENOMINADOR_DM_CONTROLADOS > 0 ? kpis.NUMERADOR_HBA1C / kpis.DENOMINADOR_DM_CONTROLADOS : 0) },
        { label: "Tamizaje Microalbuminuria (en DM)", valor: formatPercent(kpis.DENOMINADOR_DM_CONTROLADOS > 0 ? kpis.NUMERADOR_MICROALBUMINURIA / kpis.DENOMINADOR_DM_CONTROLADOS : 0) },
      ],
      calidadDato: parseAIContent(aiContent.dataQuality),
      observaciones: parseAIContent(aiContent.specificObservations),
      compromisos: parseAIContent(aiContent.actions),
    };
  };

 const handleGeneratePdf = async () => {
    if (!lastResults) {
      toast({ title: 'Error', description: 'Primero procese un archivo.', variant: 'destructive' });
      return;
    }
    setIsGeneratingPdf(true);
    toast({ title: 'Generando PDF con IA...', description: 'Redactando análisis, esto puede tardar un momento.' });

    try {
        const monthName = new Date(Number(selectedYear), Number(selectedMonth) - 1).toLocaleString('es', { month: 'long' });

        let resultsForPdf: DataProcessingResult = lastResults;
        let targetIps: string | undefined;
        let targetMunicipio: string | undefined;
        
        if (selectedIpsForPdf !== 'all') {
            const [ips, municipio] = selectedIpsForPdf.split('|');
            targetIps = ips;
            targetMunicipio = municipio;

            const specificGroupData: GroupedResult | undefined = lastResults.groupedData.find(
                g => g.keys.ips === targetIps && g.keys.municipio === targetMunicipio
            );
            
            if (specificGroupData) {
                resultsForPdf = {
                    ...lastResults,
                    R: { ...specificGroupData.results, TOTAL_FILAS: specificGroupData.rowCount, FALTANTES_ENCABEZADOS: lastResults.R.FALTANTES_ENCABEZADOS },
                    groupedData: [specificGroupData],
                };
            } else {
                 throw new Error(`No se encontraron datos para ${targetIps} en ${targetMunicipio}`);
            }
        }

        const aiContent = await generateReportText({
            results: resultsForPdf,
            targetIps: targetIps,
            targetMunicipio: targetMunicipio,
            corte: {
                year: Number(selectedYear),
                month: Number(selectedMonth),
                monthName: monthName
            }
        });
        
        const datosInforme = mapToInformeDatos(resultsForPdf, aiContent, targetIps, targetMunicipio);
        
        const backgroundImg = await loadImageAsBase64('/imagenes pdf/IMAGENEN UNIFICADA.jpg');
        
        const images: PdfImages = { background: backgroundImg };
        
        await descargarInformePDF(datosInforme, images);

    } catch (error) {
        console.error("Error generando el PDF:", error);
        toast({ title: 'Error', description: 'No se pudo generar el PDF con IA.', variant: 'destructive' });
    } finally {
        setIsGeneratingPdf(false);
    }
 };


  const handleBulkGeneratePdf = async () => {
    if (!lastResults) {
      toast({ title: 'Error', description: 'Primero procese un archivo.', variant: 'destructive' });
      return;
    }
    setIsGeneratingPdf(true);
    toast({ title: 'Generando PDFs Masivos...', description: 'Esto puede tardar varios minutos. No cierre la ventana.' });

    const zip = new JSZip();
    const monthName = new Date(Number(selectedYear), Number(selectedMonth) - 1).toLocaleString('es', { month: 'long' });

    const mockAiContent: AIContent = {
        reference: "<p>Análisis de indicadores de gestión del riesgo, sin redacción de IA.</p>",
        summary: "<p>Análisis pendiente. Revisar datos para conclusiones.</p>",
        dataQuality: "<p>Oportunidades de mejora no analizadas por IA. Revisar datos para conclusiones.</p>",
        specificObservations: "<p>Observaciones no generadas. Revisar indicadores.</p>",
        actions: "<p>Compromisos y acciones por definir.</p>",
    };
    
    const pdfMake = (await import("pdfmake/build/pdfmake")).default;
    const pdfFonts = (await import("pdfmake/build/vfs_fonts")).default;
    pdfMake.vfs = pdfFonts;
    
    try {
        const backgroundImg = await loadImageAsBase64('/imagenes pdf/IMAGENEN UNIFICADA.jpg');
      
        const images: PdfImages = { background: backgroundImg };
      
        const uniqueGroups = [...new Map(lastResults.groupedData.map(item => [`${item.keys.ips}|${item.keys.municipio}`, item])).values()];

        for (const group of uniqueGroups) {
            const { ips, municipio } = group.keys;
            toast({ title: `Generando: ${ips} - ${municipio}`, description: 'Por favor, espere...' });
            
            const resultsForPdf: DataProcessingResult = {
                ...lastResults,
                R: { ...group.results, TOTAL_FILAS: group.rowCount, FALTANTES_ENCABEZADOS: lastResults.R.FALTANTES_ENCABEZADOS },
                groupedData: [group],
            };

            const reportData = mapToInformeDatos(resultsForPdf, mockAiContent, ips, municipio);
            
            const docDefinition = buildDocDefinition(reportData, images);

            const pdfDoc = pdfMake.createPdf(docDefinition);

            const pdfBlob = await new Promise<Blob>((resolve) => {
                pdfDoc.getBlob((blob) => resolve(blob));
            });

            const fileName = `Informe_${ips.replace(/\s/g, '_')}_${municipio.replace(/\s/g, '_')}.pdf`;
            zip.file(fileName, pdfBlob);
        }

        toast({ title: 'Comprimiendo archivos...', description: 'Preparando la descarga del archivo ZIP.' });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Informes_Masivos_${monthName}_${selectedYear}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        toast({ title: 'Éxito', description: 'La descarga del archivo ZIP ha comenzado.' });

    } catch (error) {
        console.error("Error generando el ZIP de PDFs:", error);
        toast({ title: 'Error', description: 'No se pudo generar el archivo ZIP.', variant: 'destructive' });
    } finally {
        setIsGeneratingPdf(false);
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
            'DENOMINADOR_CREATININA': g.results.DENOMINADOR_CREATININA,
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
  }

  const formatPercent = (value: number) => {
    if (value === 0) return '0%';
    if (!value || !Number.isFinite(value)) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  }

  const { departments, filteredGroupedData } = useMemo(() => {
    if (!lastResults) return { departments: [], filteredGroupedData: [] };
    const departments = [...new Set(lastResults.groupedData.map(g => g.keys.dpto))].sort();
    
    const filtered = selectedDepartment === 'all' 
      ? lastResults.groupedData
      : lastResults.groupedData.filter(g => g.keys.dpto === selectedDepartment);
      
    return { departments, filteredGroupedData: filtered };
  }, [lastResults, selectedDepartment]);


  const kpis = useMemo(() => {
    if (!lastResults) return null;
    
    if (selectedDepartment === 'all') {
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
            (acc as any)[key] += group.results[key] || 0;
        });
        acc.TOTAL_FILAS += group.rowCount;
        return acc;
    }, initialKpis as any);

  }, [lastResults, filteredGroupedData, selectedDepartment]);
  

  const kpiGroups = kpis ? [
    {
      title: 'Resultado Captacion HTA',
      cards: [
        { label: 'Pacientes HTA (Numerador)', key: 'NUMERADOR_HTA', description: 'Pacientes HTA (18-69a) encontrados en el archivo.' },
        { label: 'Población HTA (Denominador)', key: 'DENOMINADOR_HTA_MENORES', description: 'Total de pacientes con diagnóstico de HTA según archivo de población.' },
        { label: 'Resultado HTA', key: 'RESULTADO_HTA', isPercentage: true, value: formatPercent(kpis.DENOMINADOR_HTA_MENORES > 0 ? kpis.NUMERADOR_HTA / kpis.DENOMINADOR_HTA_MENORES : 0), description: '(Numerador HTA / Población HTA)' },
      ]
    },
    {
      title: 'Resultado HTA < 60 años',
      cards: [
        { label: 'HTA Controlado <60 (Numerador)', key: 'NUMERADOR_HTA_MENORES', description: 'Pacientes HTA (18-59a) con PA < 140/90.' },
        { label: 'Población HTA <60 (Denominador)', key: 'DENOMINADOR_HTA_MENORES_ARCHIVO', description: 'Pacientes HTA (18-59a) del archivo cargado.' },
        { label: 'Resultado HTA <60', key: 'RESULTADO_HTA_MENORES', isPercentage: true, value: formatPercent(kpis.DENOMINADOR_HTA_MENORES_ARCHIVO > 0 ? kpis.NUMERADOR_HTA_MENORES / kpis.DENOMINADOR_HTA_MENORES_ARCHIVO : 0), description: '(Numerador / Denominador)' },
      ]
    },
    {
      title: 'Resultado HTA >= 60 años',
      cards: [
        { label: 'HTA Controlado >=60 (Numerador)', key: 'NUMERADOR_HTA_MAYORES', description: 'Pacientes HTA (>=60a, sin DM) con PA < 150/90.' },
        { label: 'Población HTA >=60 (Denominador)', key: 'DENOMINADOR_HTA_MAYORES', description: 'Pacientes HTA (>=60a, sin DM) del archivo cargado.' },
        { label: 'Resultado HTA >=60', key: 'RESULTADO_HTA_MAORIES', isPercentage: true, value: formatPercent(kpis.DENOMINADOR_HTA_MAYORES > 0 ? kpis.NUMERADOR_HTA_MAYORES / kpis.DENOMINADOR_HTA_MAYORES : 0), description: '(Numerador / Denominador)' },
      ]
    },
     {
      title: 'Resultado Adherencia DM (Archivo)',
      cards: [
        { label: 'Pacientes DM Archivo (Numerador)', key: 'NUMERADOR_DM', description: 'Total pacientes DM (18-69a) encontrados en el archivo.' },
        { label: 'Población DM Total (Denominador)', key: 'POBLACION_DM_TOTAL', description: 'Total de pacientes con diagnóstico de DM según archivo de población.' },
        { label: 'Resultado Adherencia DM', key: 'RESULTADO_DM_POB', isPercentage: true, value: formatPercent(kpis.POBLACION_DM_TOTAL > 0 ? kpis.NUMERADOR_DM / kpis.POBLACION_DM_TOTAL : 0), description: '(Numerador / Denominador)' },
      ]
    },
    {
      title: 'Resultado Control DM (HbA1c)',
      cards: [
        { label: 'DM Controlado (Numerador)', key: 'NUMERADOR_DM_CONTROLADOS', description: 'Pacientes DM con HbA1c < 7%.' },
        { label: 'Pacientes con DM (Denominador)', key: 'DENOMINADOR_DM_CONTROLADOS', description: 'Pacientes con DX de DM="SI" en el archivo cargado.' },
        { label: 'Resultado Control DM', key: 'RESULTADO_DM_CONTROL', isPercentage: true, value: formatPercent(kpis.DENOMINADOR_DM_CONTROLADOS > 0 ? kpis.NUMERADOR_DM_CONTROLADOS / kpis.DENOMINADOR_DM_CONTROLADOS : 0), description: '(Numerador / Denominador)' },
      ]
    },
    {
      title: 'Resultado Tamizaje Creatinina',
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
        title: 'Resultado Inasistentes',
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
    { label: 'Estadio 1', key: 'TFG_E1', description: 'Pacientes en Estadio 1 (TFG >= 90)' },
    { label: 'Estadio 2', key: 'TFG_E2', description: 'Pacientes en Estadio 2 (TFG 60-89)' },
    { label: 'Estadio 3', key: 'TFG_E3', description: 'Pacientes en Estadio 3 (TFG 30-59)' },
    { label: 'Estadio 4', key: 'TFG_E4', description: 'Pacientes en Estadio 4 (TFG 15-29)' },
    { label: 'Estadio 5', key: 'TFG_E5', description: 'Pacientes en Estadio 5 (TFG < 15)' },
    { label: 'Total con Estadio', key: 'TFG_TOTAL', description: 'Total pacientes con estadio TFG informado.' },
  ] : [];


  const issues = lastResults?.issues || { dates: [], nums: [], cats: [] };

  const chartDataHTA = kpis ? [
    { name: 'HTA General', Numerador: kpis.NUMERADOR_HTA, Denominador: kpis.DENOMINADOR_HTA_MENORES },
    { name: 'HTA <60', Numerador: kpis.NUMERADOR_HTA_MENORES, Denominador: kpis.DENOMINADOR_HTA_MENORES_ARCHIVO },
    { name: 'HTA >=60', Numerador: kpis.NUMERADOR_HTA_MAYORES, Denominador: kpis.DENOMINADOR_HTA_MAYORES },
  ] : [];

  const chartDataDM = kpis ? [
      { name: 'Adherencia DM', Numerador: kpis.NUMERADOR_DM, Denominador: kpis.POBLACION_DM_TOTAL },
      { name: 'Control DM (HbA1c)', Numerador: kpis.NUMERADOR_DM_CONTROLADOS, Denominador: kpis.DENOMINADOR_DM_CONTROLADOS },
  ] : [];

  const chartDataOtros = kpis ? [
      { name: 'Creatinina Tomada', Numerador: kpis.NUMERADOR_CREATININA, Denominador: kpis.DENOMINADOR_CREATINina },
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
          <div className="container mx-auto flex items-center justify-center relative">
            <h1 className="font-bold text-primary text-2xl uppercase">indicadores fenix</h1>
            <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <Badge variant={xlsxLoaded ? "secondary" : "destructive"}>
                  <Library className="mr-2 h-4 w-4"/>
                  XLSX: {xlsxLoaded ? 'Cargado' : 'No Cargado'}
                </Badge>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4 md:p-6 grid gap-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Cargue y Configuración</CardTitle>
              <CardDescription>Seleccione el archivo de datos y el período a analizar. La población HTA y DM se cruzará con el archivo <code>Poblacion 2025.csv</code> del servidor.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                <div className="grid gap-2">
                  <Label htmlFor="fileSelect">Archivo de Datos (.xlsx)</Label>
                  <Select value={selectedFile} onValueChange={setSelectedFile} disabled={isProcessing}>
                    <SelectTrigger id="fileSelect">
                      <SelectValue placeholder="Seleccione un archivo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFiles.length > 0 ? (
                        availableFiles.map(file => (
                          <SelectItem key={file} value={file}>{file}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-files" disabled>No hay archivos en /public/BASES DE DATOS/</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="selMes">Mes de Carga</Label>
                  <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(value)} disabled={isProcessing}>
                    <SelectTrigger id="selMes">
                      <SelectValue placeholder="Seleccione mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(12)].map((_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {new Date(0, i).toLocaleString('es', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="inpAnio">Año de Carga</Label>
                  <Input
                    id="inpAnio"
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    min="2000"
                    max="2100"
                    disabled={isProcessing}
                  />
                </div>

                <div className="flex gap-2 justify-self-end self-end w-full">
                  <Button onClick={handleProcess} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isProcessing || !selectedFile}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                    {isProcessing ? 'Procesando...' : 'Procesar Archivo'}
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
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle>Resultados de Indicadores ({selectedDepartment === 'all' ? 'Totales' : selectedDepartment})</CardTitle>
                            <CardDescription>Resumen de los KPIs calculados para la selección actual.</CardDescription>
                        </div>
                        <div className="w-[200px]">
                             <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar Depto." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los Departamentos</SelectItem>
                                    {departments.map(dpto => (
                                        <SelectItem key={dpto} value={dpto}>{dpto}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-8">
                        {kpiGroups.map((group, index) => (
                          <div key={index} className="space-y-4">
                            <h3 className="font-semibold text-card-foreground">{group.title}</h3>
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
                         <div className="grid sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                            <Button onClick={exportResults} variant="outline" disabled={isGeneratingPdf} className="mb-2 sm:mb-0 w-full sm:w-auto">
                                <FileDown className="mr-2 h-4 w-4"/>
                                Exportar Excel
                            </Button>
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
                            <div className="flex gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                                <Button onClick={handleGeneratePdf} variant="default" disabled={isGeneratingPdf} className="w-full">
                                    {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4"/>}
                                    {isGeneratingPdf ? 'Generando...' : 'Generar PDF'}
                                </Button>
                                 <Button onClick={handleBulkGeneratePdf} variant="secondary" disabled={isGeneratingPdf} className="w-full">
                                    {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Files className="mr-2 h-4 w-4"/>}
                                    {isGeneratingPdf ? 'Generando...' : 'Masivo PDF'}
                                 </Button>
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
