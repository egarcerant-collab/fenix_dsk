
'use server';
/**
 * @fileOverview A flow to generate analytical text for a health indicators report.
 *
 * - generateReportText: Takes processed data and generates narrative text for the report sections.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ReportRequestSchema, AIContentSchema, ReportRequest } from '../schemas';

export async function generateReportText(input: ReportRequest): Promise<z.infer<typeof AIContentSchema>> {
  return await reportGenerationFlow(input);
}

const reportGenerationPrompt = ai.definePrompt({
    name: 'reportGenerationPrompt',
    input: { schema: ReportRequestSchema },
    output: { schema: AIContentSchema },
    prompt: `
        You are an expert health risk analyst. Your task is to generate the narrative sections for a health indicator evaluation report based on the provided data.
        The report evaluates performance on Hypertension (HTA) and Diabetes (DM) management.
        The tone should be formal, objective, and constructive.
        The output must be in Spanish.

        DATA PROVIDED:
        - Analysis for: {{#if targetIps}}"{{targetIps}}"{{#if targetMunicipio}} en el municipio de "{{targetMunicipio}}"{{/if}}{{else}}"Consolidado all IPS"{{/if}}
        - Analysis Period: Month {{corte.monthName}}, Year {{corte.year}}
        - Total rows in the processed file: {{results.R.TOTAL_FILAS}}
        - Total HTA Population (from population file): {{results.R.DENOMINADOR_HTA_MENORES}}
        - Total DM Population (from population file): {{results.R.POBLACION_DM_TOTAL}}
        - HTA patients found in file: {{results.R.NUMERADOR_HTA}}
        - DM patients found in file: {{results.R.NUMERADOR_DM}}
        - Patients with creatinine test in last 12m: {{results.R.NUMERADOR_CREATININA}}
        - Patients with creatinine date recorded: {{results.R.DENOMINADOR_CREATININA}}
        - Patients with HbA1c test in last 6m: {{results.R.NUMERADOR_HBA1C}}
        - Patients with microalbuminuria test in last 12m: {{results.R.NUMERADOR_MICROALBUMINURIA}}
        - DM patients with HbA1c < 7%: {{results.R.NUMERADOR_DM_CONTROLADOS}}
        - Total DM patients in file: {{results.R.DENOMINADOR_DM_CONTROLADOS}}
        - Patients with follow-up absence: {{results.R.NUMERADOR_INASISTENTE}}
        - Missing columns in the file: {{#each results.R.FALTANTES_ENCABEZADOS}}- {{this}} {{/each}}
        - Data quality issues (count): Dates={{results.issues.dates.length}}, Nums={{results.issues.nums.length}}, Cats={{results.issues.cats.length}}

        GENERATE THE FOLLOWING SECTIONS (use HTML paragraphs <p> for sections that require it):

        1.  **reference**: A single paragraph. Start with "Posterior al análisis de la información reportada en la Data de Enfermedades Precursoras (HTA y DM) con corte a {{corte.monthName}} de {{corte.year}}, se realiza la evaluación de indicadores de gestión del riesgo por componente."
            Briefly state whether the analysis is for a specific entity or consolidated.

        2.  **summary**: HTML format. A summary of key findings. Compare reported patients vs. expected population. Mention total patients in the file, distribution (HTA, DM), adherence issues (absences), and if key lab tests (TFG, creatinina, HbA1c) are missing or not filled.

        3.  **dataQuality**: HTML format. Describe data quality opportunities based on missing columns and issue counts. Mention missing labs, lack of follow-up dates, empty cells, inconsistent data vs. clinical history, etc. Be concise and direct.

        4.  **specificObservations**: HTML format. State the compliance level (e.g., "incumplimiento", "cumplimiento bajo", "cumplimiento aceptable") for: Creatinine screening, HTA control, DM control, other screenings (HbA1c, microalbuminuria), and patient capture (captación).

        5.  **actions**: HTML format. A list of commitments and actions. Include: guaranteeing annual creatinine/semestral HbA1c, following up on absentees, ensuring specialist evaluations (psychology, nutrition, internal medicine, ophthalmology), improving data entry quality, and active patient search.
    `,
});


const reportGenerationFlow = ai.defineFlow(
  {
    name: 'reportGenerationFlow',
    inputSchema: ReportRequestSchema,
    outputSchema: AIContentSchema,
  },
  async (input) => {
    const { output } = await reportGenerationPrompt(input);
    if (!output) {
      throw new Error("AI failed to generate report content.");
    }
    return output;
  }
);

