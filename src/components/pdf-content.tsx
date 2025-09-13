import { ReportData } from '@/ai/schemas';

interface PdfContentProps {
  id: string;
  data: ReportData;
}

// Helper to format numbers, avoiding large decimals
const formatNumber = (num: number) => {
    if (Number.isInteger(num)) return num;
    return num.toFixed(2);
}

// Helper for text sections
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mb-4">
        <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-2">{title}</h2>
        <div className="text-xs space-y-2">{children}</div>
    </section>
);

const BulletPoint = ({ children }: { children: React.ReactNode }) => (
    <p className="pl-2 before:content-['•'] before:mr-2">{children}</p>
);

export default function PdfContent({ id, data }: PdfContentProps) {
    if (!data) return <div id={id}></div>;

    const { analysisDate, period, results, aiContent, targetIps } = data;
    const { R: kpis, groupedData } = results;

    const targetData = targetIps
        ? groupedData.find(g => g.keys.ips === targetIps)
        : null;
    
    // Use target data if available, otherwise global data
    const kpisToUse = targetData ? targetData.results : kpis;
    const rowCount = targetData ? targetData.rowCount : kpis.TOTAL_FILAS;

    const { 
        NUMERADOR_CREATININA, DENOMINADOR_CREATININA, NUMERADOR_HBA1C,
        NUMERADOR_MICROALBUMINURIA, NUMERADOR_INASISTENTE, DENOMINADOR_DM_CONTROLADOS,
        NUMERADOR_DM, POBLACION_DM_TOTAL, NUMERADOR_HTA, DENOMINADOR_HTA_MENORES
    } = kpisToUse;

    const municipio = targetData ? targetData.keys.municipio : 'Consolidado';
    const monthName = new Date(period.year, period.month - 1).toLocaleString('es-ES', { month: 'long' });


    return (
    <div id={id} className="bg-white text-black p-6" style={{ fontFamily: 'Arial, sans-serif' }}>
        
        {/* Encabezado */}
        <header className="mb-4">
            <p className="text-xs"><b>Proceso:</b> Dirección del Riesgo en Salud</p>
            <p className="text-xs"><b>Formato:</b> Evaluación de indicadores de gestantes, hipertensos y diabéticos (código DR-PP-F-06, versión 01; emisión 18/06/2019; vigencia 02/07/2019).</p>
        </header>

        <p className="text-xs mt-4"><b>Entidad evaluada:</b> {targetIps || "Todas las IPS"} – <b>Municipio:</b> {municipio}.</p>
        <p className="text-xs"><b>Vigencia del análisis:</b> {`01/01/${period.year} - 31/12/${period.year}`}.</p>
        <p className="text-xs"><b>Lugar/Fecha de evaluación:</b> Valledupar, {analysisDate.toLocaleDateString('es-ES')}.</p>

        {/* Cuerpo del Informe */}
        <main className="mt-4">
            <Section title="Referencia">
                 <p>{aiContent.reference.replace('{{corte}}', `${monthName} de ${period.year}`)}</p>
            </Section>

            <Section title="Análisis resumido">
                 <div className="space-y-1" dangerouslySetInnerHTML={{ __html: aiContent.summary }} />
            </Section>

            <Section title="Datos a extraer (Use estos puntos como checklist para tabular/monitorear)">
                <BulletPoint>Población objetivo 18–69 años (en Poblacion 2025.csv): HTA={formatNumber(DENOMINADOR_HTA_MENORES)}, DM={formatNumber(POBLACION_DM_TOTAL)}.</BulletPoint>
                <BulletPoint>Pacientes reportados en data: {rowCount}.</BulletPoint>
                <BulletPoint>Distribución: HTA={kpisToUse.NUMERADOR_HTA}, DM={kpisToUse.NUMERADOR_DM}.</BulletPoint>
                <BulletPoint>Inasistencia (adherencia por última TA): {NUMERADOR_INASISTENTE} usuarios.</BulletPoint>
                <BulletPoint>Cumplimiento creatinina: {NUMERADOR_CREATININA} de {DENOMINADOR_CREATININA} ({formatNumber(DENOMINADOR_CREATININA > 0 ? (NUMERADOR_CREATININA/DENOMINADOR_CREATININA)*100 : 0)}%).</BulletPoint>
                <BulletPoint>Cumplimiento HbA1c (en DM): {NUMERADOR_HBA1C} de {DENOMINADOR_DM_CONTROLADOS} ({formatNumber(DENOMINADOR_DM_CONTROLADOS > 0 ? (NUMERADOR_HBA1C/DENOMINADOR_DM_CONTROLADOS)*100 : 0)}%).</BulletPoint>
                <BulletPoint>Cumplimiento microalbuminuria (en DM): {NUMERADOR_MICROALBUMINURIA} de {DENOMINADOR_DM_CONTROLADOS} ({formatNumber(DENOMINADOR_DM_CONTROLADOS > 0 ? (NUMERADOR_MICROALBUMINURIA/DENOMINADOR_DM_CONTROLADOS)*100 : 0)}%).</BulletPoint>
            </Section>

            <Section title="Calidad del dato (hallazgos)">
                <div className="space-y-1" dangerouslySetInnerHTML={{ __html: aiContent.dataQuality }} />
            </Section>

            <Section title="Observaciones específicas">
                 <div className="space-y-1" dangerouslySetInnerHTML={{ __html: aiContent.specificObservations }} />
            </Section>

            <Section title="Compromisos y acciones">
                <div className="space-y-1" dangerouslySetInnerHTML={{ __html: aiContent.actions }} />
            </Section>
        </main>

        {/* Pie de Página / Firmas */}
        <footer className="mt-8 pt-4 border-t border-gray-300 text-xs">
            <p><b>Elaboró:</b> Epidemiólogo.</p>
            <p><b>Revisó:</b> Gestión de Calidad / Lider Ruta CCVM.</p>
            <p><b>Aprobó:</b> Consejo Directivo.</p>
            <p className="mt-2"><b>Participantes citados:</b> Sandra Marcela Garcerant González (Líder Ruta CCVM), Lirenys Iveth Ordosgoita Blanco (Lider de Ruta CCVM), Eduardo Garcerant (Auditor de la Dirección del Riesgo).</p>
            <p className="text-center text-gray-500 text-[10px] mt-4">Reporte generado automáticamente - {analysisDate.toLocaleString('es-ES')}</p>
        </footer>
    </div>
  );
}
