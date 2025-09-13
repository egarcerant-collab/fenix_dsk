import {z} from 'zod';

export const ProcessFileRequestSchema = z.object({
    fileDataUri: z.string().describe("The XLSX file content as a data URI."),
    year: z.number(),
    month: z.number(),
});

export type ProcessFileInput = z.infer<typeof ProcessFileRequestSchema>;

// The output schema needs to be serializable, so we use z.any() for complex objects.
// We will still have type safety within the server-side code.
export const ProcessFileResponseSchema = z.any();

// --- Schemas for AI Report Generation ---

export const AIContentSchema = z.object({
    reference: z.string().describe("Texto para la sección 'Referencia' del informe."),
    summary: z.string().describe("Texto para la sección 'Análisis resumido'. Debe ser un HTML con parrafos <p>."),
    dataQuality: z.string().describe("Texto para la sección 'Calidad del dato (hallazgos)'. Debe ser un HTML con parrafos <p>."),
    specificObservations: z.string().describe("Texto para la sección 'Observaciones específicas'. Debe ser un HTML con parrafos <p>."),
    actions: z.string().describe("Texto para la sección 'Compromisos y acciones'. Debe ser un HTML con parrafos <p>."),
});

export type AIContent = z.infer<typeof AIContentSchema>;

export const ReportDataSchema = z.object({
    analysisDate: z.date(),
    period: z.object({
        year: z.number(),
        month: z.number(),
    }),
    results: ProcessFileResponseSchema,
    aiContent: AIContentSchema,
    targetIps: z.string().optional(),
});

export type ReportData = z.infer<typeof ReportDataSchema>;

export const ReportRequestSchema = z.object({
    results: ProcessFileResponseSchema,
    targetIps: z.string().optional().describe("La IPS específica a analizar. Si no se provee, el análisis es consolidado."),
});

export type ReportRequest = z.infer<typeof ReportRequestSchema>;
