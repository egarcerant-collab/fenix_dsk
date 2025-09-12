'use server';

/**
 * @fileOverview Summarizes columns of an XLS file, using AI to determine the most relevant summarization type for each column.
 *
 * - summarizeColumns - A function that handles the column summarization process.
 * - SummarizeColumnsInput - The input type for the summarizeColumns function.
 * - SummarizeColumnsOutput - The return type for the summarizeColumns function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeColumnsInputSchema = z.object({
  columnNames: z.array(z.string()).describe('The names of the columns in the XLS file.'),
  columnDataTypes: z.array(z.string()).describe('The data types of the columns in the XLS file.'),
  columnValues: z.array(z.array(z.string())).describe('The values of the columns in the XLS file.'),
});
export type SummarizeColumnsInput = z.infer<typeof SummarizeColumnsInputSchema>;

const SummarizeColumnsOutputSchema = z.array(
  z.object({
    columnName: z.string().describe('The name of the column.'),
    summary: z.string().describe('The summary of the column.'),
  })
);
export type SummarizeColumnsOutput = z.infer<typeof SummarizeColumnsOutputSchema>;

export async function summarizeColumns(input: SummarizeColumnsInput): Promise<SummarizeColumnsOutput> {
  return summarizeColumnsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeColumnsPrompt',
  input: {schema: SummarizeColumnsInputSchema},
  output: {schema: SummarizeColumnsOutputSchema},
  prompt: `You are an expert data analyst. You are given the column names, data types, and values of columns in an XLS file.
  You must return a summary for each column that provides the user with key insights about the data.
  The summary should be tailored to the data type of the column. For example, for numerical columns, you should provide the average, min, and max values.
  For categorical columns, you should provide the unique values and their counts.

  Here is the data:

  {{#each columnNames}}
  Column Name: {{this}}
  Data Type: {{../columnDataTypes.[@index]}}
  Values: {{../columnValues.[@index]}}
  \n
  ---
  {{/each}}`,
});

const summarizeColumnsFlow = ai.defineFlow(
  {
    name: 'summarizeColumnsFlow',
    inputSchema: SummarizeColumnsInputSchema,
    outputSchema: SummarizeColumnsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
