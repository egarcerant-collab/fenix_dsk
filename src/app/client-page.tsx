
"use client";
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { FileUp, FileDown, Library, Loader2, FlaskConical } from 'lucide-react';
import Script from 'next/script';
import { DataProcessingResult } from '@/lib/data-processing';
import { processUploadedFile, processLocalTestFile } from '@/ai/actions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from "@/hooks/use-toast";


// Make XLSX global if it's loaded from a script
declare global {
  interface Window { XLSX: any; }
}

const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


export default function ClientPage() {
  const { toast } = useToast();
  const [xlsxLoaded, setXlsxLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Listo para procesar.');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string | number>('');
  const [lastResults, setLastResults] = useState<DataProcessingResult | null>(null);
  const [selectedDpto, setSelectedDpto] = useState<string>('all');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const now = new Date();
        setSelectedMonth(String(now.getMonth() + 1));
        setSelectedYear(now.getFullYear());
    }

    const interval = setInterval(() => {
      if (typeof window.XLSX !== 'undefined') {
        setXlsxLoaded(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);


 const startProcessing = (action: Promise<DataProcessingResult>) => {
    setIsProcessing(true);
    setProgress(20);
    setStatus('Procesando archivo en el servidor...');

    action.then(results => {
      setLastResults(results);
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
        toast({ title: 'Error', description: 'Por favor, seleccione un archivo .xlsx o .xls', variant: 'destructive' });
        return;
    }
    if (!selectedYear || !selectedMonth) {
        toast({ title: 'Error', description: 'Por favor, seleccione mes y año.', variant: 'destructive' });
        return;
    }

    const fileDataUri = await fileToDataUri(selectedFile);
    startProcessing(processUploadedFile({
      fileDataUri,
      year: Number(selectedYear),
      month: Number(selectedMonth)
    }));
  };

 const handleProcessLocal = async () => {
    if (!selectedYear || !selectedMonth) {
        toast({ title: 'Error', description: 'Por favor, seleccione mes y año.', variant: 'destructive' });
        return;
    }
     startProcessing(processLocalTestFile(Number(selectedYear), Number(selectedMonth)));
 }


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
  
  const kpis = lastResults?.R;

  const kpiGroups = kpis ? [
    {
      title: 'Resultado HTA General',
      cards: [
        { label: 'HTA Controlado (Numerador)', key: 'NUMERADOR_HTA', description: 'Pacientes HTA (18-69a) con PA < 140/90.' },
        { label: 'Población HTA (Denominador)', key: 'DENOMINADOR_HTA_MENORES', description: 'Total de pacientes con diagnóstico de HTA según archivo de población.' },
        { label: 'Resultado HTA', key: 'RESULTADO_HTA', isPercentage: true, value: formatPercent(kpis.DENOMINADOR_HTA_MENORES > 0 ? kpis.NUMERADOR_HTA / kpis.DENOMINADOR_HTA_MENORES : 0), description: '(Numerador HTA / Población HTA)' },
      ]
    },
    {
      title: 'Resultado HTA &lt; 60 años',
      cards: [
        { label: 'HTA Controlado &lt;60 (Numerador)', key: 'NUMERADOR_HTA_MENORES', description: 'Pacientes HTA (18-59a) con PA &lt; 140/90.' },
        { label: 'Población HTA &lt;60 (Denominador)', key: 'DENOMINADOR_HTA_MENORES_ARCHIVO', description: 'Pacientes HTA (18-59a) del archivo cargado.' },
        { label: 'Resultado HTA &lt;60', key: 'RESULTADO_HTA_MENORES', isPercentage: true, value: formatPercent(kpis.DENOMINADOR_HTA_MENORES_ARCHIVO > 0 ? kpis.NUMERADOR_HTA_MENORES / kpis.DENOMINADOR_HTA_MENORES_ARCHIVO : 0), description: '(Numerador / Denominador)' },
      ]
    },
    {
      title: 'Resultado HTA &gt;= 60 años',
      cards: [
        { label: 'HTA Controlado ≥60 (Numerador)', key: 'NUMERADOR_HTA_MAYORES', description: 'Pacientes HTA (≥60a, sin DM) con PA &lt; 150/90.' },
        { label: 'Población HTA ≥60 (Denominador)', key: 'DENOMINADOR_HTA_MAYORES', description: 'Pacientes HTA (≥60a, sin DM) del archivo cargado.' },
        { label: 'Resultado HTA ≥60', key: 'RESULTADO_HTA_MAYORES', isPercentage: true, value: formatPercent(kpis.DENOMINADOR_HTA_MAYORES > 0 ? kpis.NUMERADOR_HTA_MAYORES / kpis.DENOMINADOR_HTA_MAYORES : 0), description: '(Numerador / Denominador)' },
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
        { label: 'DM Controlado (Numerador)', key: 'NUMERADOR_DM_CONTROLADOS', description: 'Pacientes DM con HbA1c &lt; 7%.' },
        { label: 'Pacientes con DM (Denominador)', key: 'DENOMINADOR_DM_CONTROLADOS', description: 'Pacientes con DX de DM="SI" en el archivo cargado.' },
        { label: 'Resultado Control DM', key: 'RESULTADO_DM_CONTROL', isPercentage: true, value: formatPercent(kpis.DENOMINADOR_DM_CONTROLADOS > 0 ? kpis.NUMERADOR_DM_CONTROLADOS / kpis.DENOMINADOR_DM_CONTROLADOS : 0), description: '(Numerador / Denominador)' },
      ]
    }
  ] : [];

  const otherKpis = kpis ? [
    { label: 'Total Filas Leídas', key: 'TOTAL_FILAS', description: 'Número total de registros en el archivo.' },
    { label: 'Creatinina Tomada (Numerador)', key: 'NUMERADOR_CREATININA', description: 'Pacientes DM con creatinina en últimos 12 meses.' },
    { label: 'Denominador Creatinina', key: 'DENOMINADOR_CREATININA', description: 'Total de registros con fecha de creatinina.' },
    { label: 'HbA1c Tomada (DM)', key: 'NUMERADOR_HBA1C', description: 'Pacientes DM con HbA1c en últimos 6 meses.' },
    { label: 'Microalbuminuria Tomada (DM)', key: 'NUMERADOR_MICROALBUMINURIA', description: 'Pacientes DM con microalbuminuria en últimos 12 meses.' },
    { label: 'Inasistentes a Control', key: 'NUMERADOR_INASISTENTE', description: 'Pacientes con fecha de PA registrada pero fuera de los últimos 6 meses.' },
  ] : [];

  const issues = lastResults?.issues || { dates: [], nums: [], cats: [] };

  const chartDataHTA = kpis ? [
    { name: 'HTA General', Numerador: kpis.NUMERADOR_HTA, Denominador: kpis.DENOMINADOR_HTA_MENORES },
    { name: 'HTA &lt; 60a', Numerador: kpis.NUMERADOR_HTA_MENORES, Denominador: kpis.DENOMINADOR_HTA_MENORES_ARCHIVO },
    { name: 'HTA &gt;= 60a', Numerador: kpis.NUMERADOR_HTA_MAYORES, Denominador: kpis.DENOMINADOR_HTA_MAYORES },
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

  const departamentos = lastResults ? [...new Set(lastResults.groupedData.map(item => item.keys.dpto))] : [];

  const filteredGroupedData = lastResults?.groupedData.filter(g => selectedDpto === 'all' || g.keys.dpto === selectedDpto);


  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
        strategy="lazyOnload"
        onLoad={() => setXlsxLoaded(true)}
      />

      <div className="min-h-screen bg-background text-foreground font-sans">
        <header className="bg-card py-4 px-6 border-b">
          <div className="container mx-auto flex items-center justify-between">
            <h1 className="font-bold text-primary">Excel Data Insights</h1>
            <Badge variant={xlsxLoaded ? "secondary" : "destructive"}>
              <Library className="mr-2 h-4 w-4"/>
              XLSX: {xlsxLoaded ? 'Cargado' : 'No Cargado'}
            </Badge>
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
                  <Label htmlFor="fileInput">Archivo de Datos (.xlsx)</Label>
                  <Input
                    id="fileInput"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    disabled={isProcessing}
                    className="file:text-primary file:font-semibold"
                  />
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

                <div className="flex gap-2 justify-self-end self-end w-full md:w-auto">
                   <Button onClick={handleProcessLocal} variant="outline" className="w-full" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                    Procesar Prueba
                  </Button>
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
                    <CardHeader>
                        <CardTitle>Resultados de Indicadores (Totales)</CardTitle>
                        <CardDescription>Resumen de los KPIs calculados para todo el archivo.</CardDescription>
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
                                           <p className="font-semibold mt-1">{label}</p>
                                        </div>
                                        <p className="text-muted-foreground mt-2">{description}</p>
                                    </Card>
                                ))}
                            </div>
                          </div>
                        ))}
                         <div className="border-t pt-8 space-y-4">
                            <h3 className="font-semibold text-card-foreground">Otros Indicadores y Métricas</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                               {otherKpis.map(({ label, key, description }) => (
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
                    </CardContent>
                </Card>

                 <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <CardTitle>Tabla de Indicadores Consolidados</CardTitle>
                        <CardDescription>Resultados agrupados por Departamento, Municipio e IPS de seguimiento.</CardDescription>
                      </div>
                      <div className="w-full sm:w-auto sm:min-w-[200px]">
                        <Select value={selectedDpto} onValueChange={setSelectedDpto}>
                          <SelectTrigger>
                            <SelectValue placeholder="Filtrar por Departamento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los Departamentos</SelectItem>
                            {departamentos.map(dpto => (
                              <SelectItem key={dpto} value={dpto}>{dpto}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                     <Accordion type="single" collapsible className="w-full space-y-2">
                      {filteredGroupedData && filteredGroupedData.map((g, index) => {
                        const poblacionHTA = g.results.DENOMINADOR_HTA_MENORES;
                        const resultadoHTA = poblacionHTA > 0 ? g.results.NUMERADOR_HTA / poblacionHTA : 0;
                        const resultadoDMAdh = g.results.POBLACION_DM_TOTAL > 0 ? g.results.NUMERADOR_DM / g.results.POBLACION_DM_TOTAL : 0;
                        const resultadoDMCont = g.results.DENOMINADOR_DM_CONTROLADOS > 0 ? g.results.NUMERADOR_DM_CONTROLADOS / g.results.DENOMINADOR_DM_CONTROLADOS : 0;
                        const resultadoMenores = g.results.DENOMINADOR_HTA_MENORES_ARCHIVO > 0 ? g.results.NUMERADOR_HTA_MENORES / g.results.DENOMINADOR_HTA_MENORES_ARCHIVO : 0;
                        const resultadoMayores = g.results.DENOMINADOR_HTA_MAYORES > 0 ? g.results.NUMERADOR_HTA_MAYORES / g.results.DENOMINADOR_HTA_MAYORES : 0;

                        return (
                          <AccordionItem value={`item-${index}`} key={index} className="border rounded-md px-4">
                            <AccordionTrigger className="py-4 w-full [&>svg]:ml-auto">
                              <div className="flex flex-col md:flex-row md:items-center md:gap-4 w-full text-left">
                                <div className="flex-1 mb-2 md:mb-0">
                                  <div className="font-medium">{g.keys.ips}</div>
                                  <div className="text-muted-foreground">{g.keys.municipio}, {g.keys.dpto}</div>
                                </div>
                                <div className="flex gap-4">
                                  <div className="text-center">
                                    <div className="font-semibold text-muted-foreground">Res. HTA</div>
                                    <div className={`font-bold ${resultadoHTA < 0.7 ? 'text-red-600' : 'text-green-600'}`}>
                                      {formatPercent(resultadoHTA)}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-muted-foreground">Res. DM Adh.</div>
                                    <div className={`font-bold ${resultadoDMAdh < 0.7 ? 'text-red-600' : 'text-green-600'}`}>
                                      {formatPercent(resultadoDMAdh)}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-muted-foreground">Res. DM Cont.</div>
                                    <div className={`font-bold ${resultadoDMCont < 0.7 ? 'text-red-600' : 'text-green-600'}`}>
                                      {formatPercent(resultadoDMCont)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="p-4 bg-muted/50 border-t -mx-4 -mb-4">
                                  <Accordion type="multiple" className="space-y-2">
                                    <AccordionItem value="hta-general">
                                        <AccordionTrigger className="bg-background rounded-md px-4 py-2 font-semibold">HTA General</AccordionTrigger>
                                        <AccordionContent className="pt-2">
                                            <div className="grid grid-cols-3 gap-2 p-2 border rounded-md">
                                                <KpiDetail label="Num HTA" value={g.results.NUMERADOR_HTA} />
                                                <KpiDetail label="Pob HTA" value={g.results.DENOMINADOR_HTA_MENORES} />
                                                <KpiDetail label="Res HTA" value={formatPercent(resultadoHTA)} />
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="hta-edad">
                                        <AccordionTrigger className="bg-background rounded-md px-4 py-2 font-semibold">HTA por Edad</AccordionTrigger>
                                        <AccordionContent className="pt-2 space-y-2">
                                              <div className="grid grid-cols-3 gap-2 p-2 border rounded-md">
                                                <KpiDetail label="Num HTA <60" value={g.results.NUMERADOR_HTA_MENORES} />
                                                <KpiDetail label="Den HTA <60 (Arch.)" value={g.results.DENOMINADOR_HTA_MENORES_ARCHIVO} />
                                                <KpiDetail label="% <60" value={formatPercent(resultadoMenores)} />
                                              </div>
                                              <div className="grid grid-cols-3 gap-2 p-2 border rounded-md">
                                                <KpiDetail label="Num HTA ≥60" value={g.results.NUMERADOR_HTA_MAYORES} />
                                                <KpiDetail label="Den HTA ≥60 (Arch.)" value={g.results.DENOMINADOR_HTA_MAYORES} />
                                                <KpiDetail label="% ≥60" value={formatPercent(resultadoMayores)} />
                                              </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="dm">
                                        <AccordionTrigger className="bg-background rounded-md px-4 py-2 font-semibold">Resultados DM</AccordionTrigger>
                                        <AccordionContent className="pt-2 space-y-2">
                                              <div className="grid grid-cols-3 gap-2 p-2 border rounded-md">
                                                <KpiDetail label="Num DM Adh." value={g.results.NUMERADOR_DM} />
                                                <KpiDetail label="Pob DM Adh. (Pob.)" value={g.results.POBLACION_DM_TOTAL} />
                                                <KpiDetail label="% DM Adh." value={formatPercent(resultadoDMAdh)} />
                                              </div>
                                              <div className="grid grid-cols-3 gap-2 p-2 border rounded-md">
                                                <KpiDetail label="Num DM Cont." value={g.results.NUMERADOR_DM_CONTROLADOS} />
                                                <KpiDetail label="Den DM Cont. (Arch.)" value={g.results.DENOMINADOR_DM_CONTROLADOS} />
                                                <KpiDetail label="% DM Cont." value={formatPercent(resultadoDMCont)} />
                                              </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                     </Accordion>
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
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Observaciones de Calidad de Datos</CardTitle>
                                <CardDescription>Detalles sobre datos que pueden requerir revisión.</CardDescription>
                            </div>
                            <Button onClick={exportResults} variant="outline">
                                <FileDown className="mr-2 h-4 w-4"/>
                                Exportar Todo
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="item-1">
                             <AccordionTrigger className="font-semibold flex justify-between w-full">
                                <span>Columnas esperadas no encontradas</span> 
                                <Badge variant={kpis.FALTANTES_ENCABEZADOS?.length > 0 ? "destructive" : "secondary"}>{kpis.FALTANTES_ENCABEZADOS?.length || 0}</Badge>
                             </AccordionTrigger>
                             <AccordionContent>
                               <div className="max-h-[300px] overflow-auto border rounded-md p-4 bg-muted/50">
                                  <ul className="list-disc pl-5 font-mono">
                                   {(kpis.FALTANTES_ENCABEZADOS || []).map((h: string, i: number) => <li key={i}>{h}</li>)}
                                  </ul>
                               </div>
                             </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="item-2">
                             <AccordionTrigger className="font-semibold flex justify-between w-full">
                               <span>Fechas con formato dudoso</span>
                               <Badge variant={issues.dates.length > 0 ? "destructive" : "secondary"}>{issues.dates.length}</Badge>
                              </AccordionTrigger>
                             <AccordionContent>
                                <div className="max-h-[300px] overflow-auto border rounded-md">
                                  <Table>
                                    <TableHeader><TableRow><TableHead>Fila</TableHead><TableHead>Campo</TableHead><TableHead>Valor</TableHead><TableHead>Observación</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                      {issues.dates.slice(0, 100).map((row, i) => <TableRow key={i}><TableCell>{row[0]}</TableCell><TableCell>{row[1]}</TableCell><TableCell>{row[2]}</TableCell><TableCell>{row[3]}</TableCell></TableRow>)}
                                      {issues.dates.length > 100 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Mostrando 100 de {issues.dates.length}.</TableCell></TableRow>}
                                    </TableBody>
                                  </Table>
                                </div>
                             </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="item-3">
                             <AccordionTrigger className="font-semibold flex justify-between w-full">
                                <span>Campos numéricos inválidos</span>
                                <Badge variant={issues.nums.length > 0 ? "destructive" : "secondary"}>{issues.nums.length}</Badge>
                             </AccordionTrigger>
                             <AccordionContent>
                               <div className="max-h-[300px] overflow-auto border rounded-md">
                                 <Table>
                                    <TableHeader><TableRow><TableHead>Fila</TableHead><TableHead>Campo</TableHead><TableHead>Valor</TableHead><TableHead>Observación</TableHead></TableRow></TableHeader>
                                   <TableBody>
                                     {issues.nums.slice(0, 100).map((row, i) => <TableRow key={i}><TableCell>{row[0]}</TableCell><TableCell>{row.1]}</TableCell><TableCell>{row[2]}</TableCell><TableCell>{row[3]}</TableCell></TableRow>)}
                                     {issues.nums.length > 100 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Mostrando 100 de {issues.nums.length}.</TableCell></TableRow>}
                                   </TableBody>
                                 </Table>
                               </div>
                             </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="item-4">
                             <AccordionTrigger className="font-semibold flex justify-between w-full">
                                <span>Valores categóricos inesperados</span>
                                <Badge variant={issues.cats.length > 0 ? "destructive" : "secondary"}>{issues.cats.length}</Badge>
                             </AccordionTrigger>
                             <AccordionContent>
                               <div className="max-h-[300px] overflow-auto border rounded-md">
                                 <Table>
                                    <TableHeader><TableRow><TableHead>Fila</TableHead><TableHead>Campo</TableHead><TableHead>Valor</TableHead><TableHead>Esperado</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                      {issues.cats.slice(0, 100).map((row, i) => <TableRow key={i}><TableCell>{row[0]}</TableCell><TableCell>{row[1]}</TableCell><TableCell>{row[2]}</TableCell><TableCell>{row[3]}</TableCell></TableRow>)}
                                      {issues.cats.length > 100 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Mostrando 100 de {issues.cats.length}.</TableCell></TableRow>}
                                    </TableBody>
                                 </Table>
                               </div>
                             </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
             </div>
          )}
        </main>
      </div>
    </>
  );
}

const KpiDetail = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex flex-col items-center justify-center p-2 border rounded-md bg-background text-center h-full">
        <div className="font-bold text-primary">{value}</div>
        <div className="text-muted-foreground mt-1">{label}</div>
    </div>
);

    