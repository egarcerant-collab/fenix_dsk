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
