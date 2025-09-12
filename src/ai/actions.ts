'use server';
/**
 * @fileOverview Server actions for data processing.
 *
 * - processUploadedFile - A flow that takes an uploaded file, processes it against a local population CSV, and returns calculated KPIs.
 */
import {ai} from '@/ai/genkit';
import {DataProcessingResult, processDataFile} from '@/lib/data-processing';
import {ProcessFileRequestSchema, ProcessFileResponseSchema, ProcessFileInput} from './schemas';

export async function processUploadedFile(input: ProcessFileInput): Promise<DataProcessingResult> {
    return processFileFlow(input);
}

const processFileFlow = ai.defineFlow(
  {
    name: 'processFileFlow',
    inputSchema: ProcessFileRequestSchema,
    outputSchema: ProcessFileResponseSchema,
  },
  async ({ fileDataUri, year, month }) => {
    
    // Convert data URI to a Buffer
    const base64Data = fileDataUri.split(',')[1];
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    // Since processDataFile expects a "File"-like object with a name, we can mock it.
    // The name isn't used for logic, just for potential error messages.
    const mockFile = {
        name: 'uploaded.xlsx',
        buffer: fileBuffer,
    };
    
    // The progress callback is now handled on the server, we won't stream it to the client for simplicity.
    const onProgress = (percentage: number, status: string) => {
        console.log(`Processing Progress: ${percentage}% - ${status}`);
    };

    // The result will be a JSON-serializable object.
    const results = await processDataFile(mockFile as any, year, month, onProgress);
    
    // The flow needs to return a serializable object. The result from processDataFile should already be serializable.
    return results;
  }
);
