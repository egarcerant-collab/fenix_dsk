
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
    <div id={id} className="bg-white text-black p-8" style={{ width: '800px' }}>
      <header className="text-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-blue-700">Reporte de Indicadores de Salud</h1>
        <p className="text-gray-600">Periodo de Análisis: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}</p>
      </header>

      <main>
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Indicadores Globales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {kpiGroups.map((group, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg text-gray-800" dangerouslySetInnerHTML={{ __html: group.title }}></h3>
                    <div className="grid grid-cols-3 gap-2">
                      {group.cards.map((card, cardIndex) => (
                        <div key={cardIndex} className="p-2 text-center rounded-md bg-gray-50">
                          <p className="text-xl font-bold text-blue-600">{card.value}</p>
                          <p className="text-xs font-semibold text-gray-600">{card.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Detalle por IPS</CardTitle>
              <CardDescription>Resultados consolidados por IPS de seguimiento.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">IPS</TableHead>
                    <TableHead className="font-bold text-center">Municipio</TableHead>
                    <TableHead className="font-bold text-center">Res. HTA</TableHead>
                    <TableHead className="font-bold text-center">Res. DM Control</TableHead>
                    <TableHead className="font-bold text-center">Res. Creatinina</TableHead>
                    <TableHead className="font-bold text-center">Res. Inasistentes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedData.slice(0, 20).map((g, index) => {
                     const resultadoHTA = g.results.DENOMINADOR_HTA_MENORES > 0 ? g.results.NUMERADOR_HTA / g.results.DENOMINADOR_HTA_MENORES : 0;
                     const resultadoDMCont = g.results.DENOMINADOR_DM_CONTROLADOS > 0 ? g.results.NUMERADOR_DM_CONTROLADOS / g.results.DENOMINADOR_DM_CONTROLADOS : 0;
                     const resultadoCrea = g.results.DENOMINADOR_CREATININA > 0 ? g.results.NUMERADOR_CREATININA / g.results.DENOMINADOR_CREATININA : 0;
                     const resultadoInasist = g.rowCount > 0 ? g.results.NUMERADOR_INASISTENTE / g.rowCount : 0;
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{g.keys.ips}</TableCell>
                        <TableCell className="text-center">{g.keys.municipio}</TableCell>
                        <TableCell className="text-center">{formatPercent(resultadoHTA)}</TableCell>
                        <TableCell className="text-center">{formatPercent(resultadoDMCont)}</TableCell>
                        <TableCell className="text-center">{formatPercent(resultadoCrea)}</TableCell>
                        <TableCell className="text-center">{formatPercent(resultadoInasist)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {groupedData.length > 20 && (
                      <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500">
                              Mostrando las primeras 20 de {groupedData.length} agrupaciones.
                          </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </main>
      <footer className="text-center mt-8 pt-4 border-t">
        <p className="text-xs text-gray-500">Reporte generado automáticamente - {new Date().toLocaleString('es-ES')}</p>
      </footer>
    </div>
  );
}
