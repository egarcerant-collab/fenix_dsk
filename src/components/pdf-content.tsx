
import { DataProcessingResult } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface PdfContentProps {
  id: string;
  results: DataProcessingResult;
  formatPercent: (value: number) => string;
}

export default function PdfContent({ id, results, formatPercent }: PdfContentProps) {
  const { R: kpis, groupedData } = results;

  const kpiGroups = kpis ? [
    {
      title: 'Resultado HTA General',
      cards: [
        { label: 'HTA Controlado (Numerador)', value: kpis.NUMERADOR_HTA },
        { label: 'Población HTA (Denominador)', value: kpis.DENOMINADOR_HTA_MENORES },
        { label: 'Resultado HTA', value: formatPercent(kpis.DENOMINADOR_HTA_MENORES > 0 ? kpis.NUMERADOR_HTA / kpis.DENOMINADOR_HTA_MENORES : 0) },
      ]
    },
    {
      title: 'Resultado Control DM (HbA1c)',
      cards: [
        { label: 'DM Controlado (Numerador)', value: kpis.NUMERADOR_DM_CONTROLADOS },
        { label: 'Pacientes con DM (Denominador)', value: kpis.DENOMINADOR_DM_CONTROLADOS },
        { label: 'Resultado Control DM', value: formatPercent(kpis.DENOMINADOR_DM_CONTROLADOS > 0 ? kpis.NUMERADOR_DM_CONTROLADOS / kpis.DENOMINADOR_DM_CONTROLADOS : 0) },
      ]
    },
     {
      title: 'Resultado Tamizaje Creatinina',
      cards: [
        { label: 'Creatinina Tomada (Numerador)', value: kpis.NUMERADOR_CREATININA },
        { label: 'Denominador Creatinina', value: kpis.DENOMINADOR_CREATININA },
        { label: 'Resultado Creatinina', value: formatPercent(kpis.DENOMINADOR_CREATININA > 0 ? kpis.NUMERADOR_CREATININA / kpis.DENOMINADOR_CREATININA : 0) },
      ]
    },
    {
        title: 'Resultado Inasistentes',
        cards: [
            { label: 'Inasistentes a Control', value: kpis.NUMERADOR_INASISTENTE },
            { label: 'Total Filas Leídas', value: kpis.TOTAL_FILAS },
            { label: 'Resultado Inasistentes', value: formatPercent(kpis.TOTAL_FILAS > 0 ? kpis.NUMERADOR_INASISTENTE / kpis.TOTAL_FILAS : 0) },
        ]
    }
  ] : [];

  return (
    <div id={id} className="bg-white text-black p-8 font-sans" style={{ width: '210mm' }}>
      <header className="text-center mb-8 border-b-2 border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Reporte de Indicadores de Salud</h1>
        <p className="text-sm text-gray-600">Periodo de Análisis: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}</p>
      </header>

      <main>
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Resumen de Indicadores Globales</h2>
          <div className="grid grid-cols-2 gap-4">
            {kpiGroups.map((group, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="font-semibold text-base text-gray-800 mb-3" dangerouslySetInnerHTML={{ __html: group.title }}></h3>
                <div className="grid grid-cols-3 gap-2">
                  {group.cards.map((card, cardIndex) => (
                    <div key={cardIndex} className="p-2 text-center rounded-md bg-white border border-gray-100">
                      <p className="text-lg font-bold text-blue-600">{card.value}</p>
                      <p className="text-[10px] font-semibold text-gray-600 leading-tight">{card.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
           <h2 className="text-xl font-semibold text-gray-700 mb-4">Detalle por IPS</h2>
           <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Table className="text-xs">
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700">IPS</TableHead>
                    <TableHead className="font-bold text-gray-700 text-center">Municipio</TableHead>
                    <TableHead className="font-bold text-gray-700 text-center">Res. HTA</TableHead>
                    <TableHead className="font-bold text-gray-700 text-center">Res. DM Control</TableHead>
                    <TableHead className="font-bold text-gray-700 text-center">Res. Creatinina</TableHead>
                    <TableHead className="font-bold text-gray-700 text-center">Res. Inasist.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedData.slice(0, 25).map((g, index) => {
                     const resultadoHTA = g.results.DENOMINADOR_HTA_MENORES > 0 ? g.results.NUMERADOR_HTA / g.results.DENOMINADOR_HTA_MENORES : 0;
                     const resultadoDMCont = g.results.DENOMINADOR_DM_CONTROLADOS > 0 ? g.results.NUMERADOR_DM_CONTROLADOS / g.results.DENOMINADOR_DM_CONTROLADOS : 0;
                     const resultadoCrea = g.results.DENOMINADOR_CREATININA > 0 ? g.results.NUMERADOR_CREATININA / g.results.DENOMINADOR_CREATININA : 0;
                     const resultadoInasist = g.rowCount > 0 ? g.results.NUMERADOR_INASISTENTE / g.rowCount : 0;
                    return (
                      <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <TableCell className="font-medium text-gray-800">{g.keys.ips}</TableCell>
                        <TableCell className="text-center text-gray-600">{g.keys.municipio}</TableCell>
                        <TableCell className="text-center font-mono">{formatPercent(resultadoHTA)}</TableCell>
                        <TableCell className="text-center font-mono">{formatPercent(resultadoDMCont)}</TableCell>
                        <TableCell className="text-center font-mono">{formatPercent(resultadoCrea)}</TableCell>
                        <TableCell className="text-center font-mono">{formatPercent(resultadoInasist)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {groupedData.length > 25 && (
                      <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-4">
                              Mostrando las primeras 25 de {groupedData.length} agrupaciones.
                          </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        </section>
      </main>
      <footer className="text-center mt-8 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">Reporte generado automáticamente - {new Date().toLocaleString('es-ES')}</p>
      </footer>
    </div>
  );
}
