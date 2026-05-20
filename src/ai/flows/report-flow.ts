'use server';
import { z } from 'zod';
import { ReportRequestSchema, AIContentSchema } from '../schemas';

// Generación de texto por IA desactivada - retorna texto base sin IA
export async function generateReportText(input: z.infer<typeof ReportRequestSchema>): Promise<z.infer<typeof AIContentSchema>> {
  return {
    reference: `<p>Posterior al análisis de la información reportada en la Data de Enfermedades Precursoras (HTA y DM) con corte a ${input.corte?.monthName ?? ''} de ${input.corte?.year ?? ''}, se realiza la evaluación de indicadores de gestión del riesgo por componente.</p>`,
    summary: '<p>Resumen del análisis de indicadores de riesgo cardiovascular. Revisar los KPIs calculados para conclusiones detalladas.</p>',
    dataQuality: '<p>Revisar columnas faltantes e inconsistencias en los datos del archivo procesado.</p>',
    specificObservations: '<p>Observaciones basadas en los indicadores calculados. Ver tabla de resultados.</p>',
    actions: '<p>Definir compromisos y acciones con base en los indicadores de cumplimiento identificados.</p>',
  };
}
