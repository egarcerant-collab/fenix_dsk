
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
        You are an expert health risk analyst. Your task is to generate a robust and detailed narrative for a health indicator evaluation report based on the provided data.
        The report evaluates performance on Hypertension (HTA) and Diabetes (DM) management.
        The tone should be formal, objective, analytical, and constructive.
        The output must be in Spanish.

        DATA PROVIDED:
        - Analysis for: {{#if targetIps}}"{{targetIps}}"{{#if targetMunicipio}} en el municipio de "{{targetMunicipio}}"{{/if}}{{else}}"Consolidado all IPS"{{/if}}
        - Analysis Period: Month {{corte.monthName}}, Year {{corte.year}}
        - Total rows in the processed file: {{results.R.TOTAL_FILAS}}
        - Total HTA Population (from population file): {{results.R.DENOMINADOR_HTA_MENORES}}
        - Total DM Population (from population file): {{results.R.POBLACION_DM_TOTAL}}
        - HTA patients found in file (18-69y): {{results.R.NUMERADOR_HTA}}
        - DM patients found in file (18-69y): {{results.R.NUMERADOR_DM}}
        - HTA patients <60 controlled: {{results.R.NUMERADOR_HTA_MENORES}} out of {{results.R.DENOMINADOR_HTA_MENORES_ARCHIVO}}
        - HTA patients >=60 controlled: {{results.R.NUMERADOR_HTA_MAYORES}} out of {{results.R.DENOMINADOR_HTA_MAYORES}}
        - DM patients with HbA1c < 7%: {{results.R.NUMERADOR_DM_CONTROLADOS}} out of {{results.R.DENOMINADOR_DM_CONTROLADOS}}
        - Patients with creatinine test in last 12m: {{results.R.NUMERADOR_CREATININA}} out of {{results.R.DENOMINADOR_CREATININA}}
        - Patients with HbA1c test in last 6m: {{results.R.NUMERADOR_HBA1C}} out of {{results.R.DENOMINADOR_DM_CONTROLADOS}}
        - Patients with microalbuminuria test in last 12m: {{results.R.NUMERADOR_MICROALBUMINURIA}} out of {{results.R.DENOMINADOR_DM_CONTROLADOS}}
        - Patients with follow-up absence: {{results.R.NUMERADOR_INASISTENTE}}
        - Missing columns in the file: {{#if results.R.FALTANTES_ENCABEZADOS}}Presenta {{results.R.FALTANTES_ENCABEZADOS.length}} columnas faltantes: {{#each results.R.FALTANTES_ENCABEZADOS}}- {{this}} {{/each}}{{else}}No se encontraron columnas faltantes.{{/if}}
        - Data quality issues (count): Dates={{results.issues.dates.length}}, Nums={{results.issues.nums.length}}, Cats={{results.issues.cats.length}}

        GENERATE THE FOLLOWING SECTIONS (use HTML paragraphs <p> and lists <ul><li>...</li></ul> where appropriate for clarity and structure):

        1.  **reference**: A single paragraph. Start with "Posterior al análisis de la información reportada en la Data de Enfermedades Precursoras (HTA y DM) con corte a {{corte.monthName}} de {{corte.year}}, se realiza la evaluación de indicadores de gestión del riesgo por componente."
            Briefly state whether the analysis is for a specific entity or consolidated.

        2.  **summary**: HTML format. Generate a comprehensive summary of key findings.
            - Compare the number of reported patients ({{results.R.NUMERADOR_HTA}} HTA, {{results.R.NUMERADOR_DM}} DM) with the expected population ({{results.R.DENOMINADOR_HTA_MENORES}} HTA, {{results.R.POBLACION_DM_TOTAL}} DM). Calculate and emphasize the capture gap or percentage.
            - Mention the total number of patients in the file ({{results.R.TOTAL_FILAS}}) and their distribution (HTA, DM).
            - Highlight key adherence issues, like follow-up absences ({{results.R.NUMERADOR_INASISTENTE}} patients) and comment on its significance relative to the total file rows.
            - Briefly mention if key lab tests (TFG, creatinina, HbA1c) are missing or have low completion rates, providing a preview of the data quality issues.

        3.  **dataQuality**: HTML format. Provide a detailed description of data quality opportunities.
            - Go beyond just listing the missing columns. Explain the *impact* of missing columns like '{{results.R.FALTANTES_ENCABEZADOS.[0]}}' on the analysis (e.g., "La ausencia de la columna de creatinina impide calcular el tamizaje renal...").
            - Comment on the number of data issues found (dates, numbers, categories) and provide examples of what these issues imply (e.g., "Se encontraron {{results.issues.dates.length}} fechas inválidas, lo que sugiere errores de digitación o formatos incorrectos que dificultan el seguimiento cronológico.").
            - Mention other common quality issues like empty cells, inconsistent data vs. clinical history, etc. Be specific and direct, framing them as "oportunidades de mejora".

        4.  **specificObservations**: HTML format. State the compliance level (e.g., "incumplimiento crítico", "cumplimiento bajo", "cumplimiento aceptable", "cumplimiento bueno") for each area and *justify it with data*.
            - Patient Capture (Captación): Justify based on the gap between reported patients vs. expected population.
            - HTA Control (<60 years): Justify using the HTA control results for this group ({{results.R.NUMERADOR_HTA_MENORES}} / {{results.R.DENOMINADOR_HTA_MENORES_ARCHIVO}}).
            - HTA Control (>=60 years): Justify using the HTA control results for this group ({{results.R.NUMERADOR_HTA_MAYORES}} / {{results.R.DENOMINADOR_HTA_MAYORES}}).
            - DM Control (HbA1c): Justify using the DM control results ({{results.R.NUMERADOR_DM_CONTROLADOS}} / {{results.R.DENOMINADOR_DM_CONTROLADOS}}).
            - Screening (Tamizaje): Justify for Creatinine, HbA1c, and microalbuminuria, comparing the numerator vs. the relevant denominator. For example, "El tamizaje de creatinina es insuficiente, cubriendo solo a {{results.R.NUMERADOR_CREATININA}} de {{results.R.DENOMINADOR_CREATININA}} pacientes con fecha registrada."

        5.  **actions**: HTML format. Generate a detailed, prioritized list of commitments and actions based on the specific observations.
            - For each observation, suggest a concrete action. Example: For low patient capture, suggest "Implementar estrategias de búsqueda activa de pacientes con diagnóstico de HTA y DM que no se encuentran en el programa."
            - Include actions for improving data quality, such as "Realizar capacitaciones al personal sobre el correcto diligenciamiento de la data, enfatizando la importancia de los campos de laboratorio y fechas."
            - Structure the recommendations as a numbered or bulleted list for clarity. Ensure actions are actionable and directly linked to the problems identified.
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
