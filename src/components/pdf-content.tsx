import { ReportData } from '@/ai/schemas';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent } from './ui/chart';

interface PdfContentProps {
  id: string;
  data: ReportData;
}

// Helper to format numbers, avoiding large decimals
const formatNumber = (num: number | undefined) => {
    if (num === null || num === undefined) return 0;
    if (Number.isInteger(num)) return num;
    return num.toFixed(2);
}

const formatPercent = (value: number | undefined) => {
    if (!value || !Number.isFinite(value)) return '0%';
    return `${(value * 100).toFixed(1)}%`;
}

// Helper for text sections
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mb-4 break-inside-avoid">
        <h2 className="text-sm font-bold border-b border-gray-400 pb-1 mb-2 text-gray-800">{title}</h2>
        <div className="text-xs space-y-2 text-gray-700">{children}</div>
    </section>
);

const BulletPoint = ({ children }: { children: React.ReactNode }) => (
    <p className="pl-2 before:content-['•'] before:mr-2">{children}</p>
);

const ChartWrapper = ({ title, children } : { title: string, children: React.ReactNode}) => (
    <div className="p-2 border rounded-lg break-inside-avoid">
        <h4 className="text-center text-xs font-semibold mb-2">{title}</h4>
        {/* The width/height are crucial for recharts to render in a headless browser/div */}
        <div style={{ width: '100%', height: '180px' }}>
            {children}
        </div>
    </div>
);

export default function PdfContent({ id, data }: PdfContentProps) {
    if (!data) return <div id={id}></div>;

    const { analysisDate, period, results, aiContent, targetIps, targetMunicipio } = data;
    const { R: kpis } = results;
    
    const municipio = targetMunicipio || 'Consolidado';
    const monthName = new Date(period.year, period.month - 1).toLocaleString('es-ES', { month: 'long' });

    // Chart data
     const chartConfig = {
        Numerador: { label: 'Numerador', color: 'hsl(207 68% 69%)' },
        Denominador: { label: 'Denominador', color: 'hsl(216 25% 90%)' },
    };

    const chartDataHTA = [
        { name: 'HTA Gen.', Numerador: kpis.NUMERADOR_HTA, Denominador: kpis.DENOMINADOR_HTA_MENORES },
        { name: 'HTA <60', Numerador: kpis.NUMERADOR_HTA_MENORES, Denominador: kpis.DENOMINADOR_HTA_MENORES_ARCHIVO },
        { name: 'HTA >=60', Numerador: kpis.NUMERADOR_HTA_MAYORES, Denominador: kpis.DENOMINADOR_HTA_MAYORES },
    ];

    const chartDataDM = [
        { name: 'Adherencia', Numerador: kpis.NUMERADOR_DM, Denominador: kpis.POBLACION_DM_TOTAL },
        { name: 'Control', Numerador: kpis.NUMERADOR_DM_CONTROLADOS, Denominador: kpis.DENOMINADOR_DM_CONTROLADOS },
    ];

    const chartDataOtros = [
        { name: 'Creatinina', Numerador: kpis.NUMERADOR_CREATININA, Denominador: kpis.DENOMINADOR_CREATININA },
        { name: 'HbA1c', Numerador: kpis.NUMERADOR_HBA1C, Denominador: kpis.DENOMINADOR_DM_CONTROLADOS },
        { name: 'Microalb.', Numerador: kpis.NUMERADOR_MICROALBUMINURIA, Denominador: kpis.DENOMINADOR_DM_CONTROLADOS },
    ];


    return (
    <div id={id} className="bg-white text-black p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', columns: 1 }}>
        
        {/* Encabezado */}
        <header className="mb-6 text-center">
            <h1 className="text-lg font-bold text-gray-800">Informe de Evaluación de Indicadores de Riesgo</h1>
            <p className="text-xs text-gray-500">Proceso: Dirección del Riesgo en Salud | Formato: DR-PP-F-06</p>
        </header>

        <div className="grid grid-cols-3 gap-4 mb-6 text-xs border-y py-2">
            <p><b>Entidad:</b> {targetIps || "Todas las IPS"}</p>
            <p><b>Municipio:</b> {municipio}</p>
            <p><b>Fecha de corte:</b> {monthName} de {period.year}</p>
            <p><b>Vigencia:</b> {`01/01/${period.year} - 31/12/${period.year}`}</p>
            <p><b>Lugar y Fecha:</b> Valledupar, {analysisDate.toLocaleDateString('es-ES')}</p>
        </div>


        {/* Cuerpo del Informe */}
        <main className="space-y-4">
            <Section title="1. Referencia">
                 <p dangerouslySetInnerHTML={{ __html: aiContent.reference }} />
            </Section>

            <Section title="2. Análisis Resumido">
                 <div className="space-y-2 text-justify" dangerouslySetInnerHTML={{ __html: aiContent.summary }} />
            </Section>

            <Section title="3. Datos a Extraer (Checklist de Monitoreo)">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <BulletPoint>Población HTA (población): {formatNumber(kpis.DENOMINADOR_HTA_MENORES)}</BulletPoint>
                    <BulletPoint>Población DM (población): {formatNumber(kpis.POBLACION_DM_TOTAL)}</BulletPoint>
                    <BulletPoint>Total pacientes en data: {formatNumber(kpis.TOTAL_FILAS)}</BulletPoint>
                    <BulletPoint>Distribución: HTA={formatNumber(kpis.NUMERADOR_HTA)}, DM={formatNumber(kpis.NUMERADOR_DM)}</BulletPoint>
                    <BulletPoint>Inasistencia (por última TA): {formatNumber(kpis.NUMERADOR_INASISTENTE)} usuarios</BulletPoint>
                    <BulletPoint>Tamizaje Creatinina: {formatPercent(kpis.DENOMINADOR_CREATININA > 0 ? kpis.NUMERADOR_CREATININA / kpis.DENOMINADOR_CREATININA : 0)}</BulletPoint>
                    <BulletPoint>Tamizaje HbA1c (en DM): {formatPercent(kpis.DENOMINADOR_DM_CONTROLADOS > 0 ? kpis.NUMERADOR_HBA1C / kpis.DENOMINADOR_DM_CONTROLADOS : 0)}</BulletPoint>
                    <BulletPoint>Tamizaje Microalbuminuria (en DM): {formatPercent(kpis.DENOMINADOR_DM_CONTROLADOS > 0 ? kpis.NUMERADOR_MICROALBUMINURIA / kpis.DENOMINADOR_DM_CONTROLADOS : 0)}</BulletPoint>
                </div>
            </Section>

             <Section title="4. Indicadores Clave (Visual)">
                <div className="grid grid-cols-3 gap-4">
                   <ChartWrapper title="Indicadores HTA">
                        <ResponsiveContainer>
                             <BarChart data={chartDataHTA} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={55} tick={{ fontSize: 10 }} />
                                <Bar dataKey="Denominador" fill={chartConfig.Denominador.color} radius={[0, 4, 4, 0]} barSize={12} />
                                <Bar dataKey="Numerador" fill={chartConfig.Numerador.color} radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                   </ChartWrapper>
                   <ChartWrapper title="Indicadores DM">
                        <ResponsiveContainer>
                             <BarChart data={chartDataDM} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={55} tick={{ fontSize: 10 }} />
                                <Bar dataKey="Denominador" fill={chartConfig.Denominador.color} radius={[0, 4, 4, 0]} barSize={12} />
                                <Bar dataKey="Numerador" fill={chartConfig.Numerador.color} radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                   </ChartWrapper>
                   <ChartWrapper title="Otros Tamizajes">
                        <ResponsiveContainer>
                             <BarChart data={chartDataOtros} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={55} tick={{ fontSize: 10 }} />
                                <Bar dataKey="Denominador" fill={chartConfig.Denominador.color} radius={[0, 4, 4, 0]} barSize={12} />
                                <Bar dataKey="Numerador" fill={chartConfig.Numerador.color} radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                   </ChartWrapper>
                </div>
             </Section>


            <Section title="5. Calidad del Dato (Hallazgos)">
                <div className="space-y-1 text-justify" dangerouslySetInnerHTML={{ __html: aiContent.dataQuality }} />
            </Section>

            <Section title="6. Observaciones Específicas">
                 <div className="space-y-1" dangerouslySetInnerHTML={{ __html: aiContent.specificObservations }} />
            </Section>

            <Section title="7. Compromisos y Acciones">
                <div className="space-y-1" dangerouslySetInnerHTML={{ __html: aiContent.actions }} />
            </Section>
        </main>

        {/* Pie de Página / Firmas */}
        <footer className="mt-8 pt-6 border-t border-gray-400 text-xs">
            <div className="grid grid-cols-3 gap-8 text-center mb-6">
                <div><p className="border-t border-gray-500 pt-2 mt-8"><b>Elaboró:</b> Epidemiólogo</p></div>
                <div><p className="border-t border-gray-500 pt-2 mt-8"><b>Revisó:</b> Gestión de Calidad</p></div>
                <div><p className="border-t border-gray-500 pt-2 mt-8"><b>Aprobó:</b> Consejo Directivo</p></div>
            </div>
            <p><b>Participantes citados:</b> Sandra Marcela Garcerant González (Líder Ruta CCVM), Lirenys Iveth Ordosgoita Blanco (Lider de Ruta CCVM), Eduardo Garcerant (Auditor de la Dirección del Riesgo).</p>
            <p className="text-center text-gray-500 text-[10px] mt-4">Reporte generado automáticamente - {analysisDate.toLocaleString('es-ES')}</p>
        </footer>
    </div>
  );
}
