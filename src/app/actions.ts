'use server';

import { summarizeColumns } from '@/ai/flows/column-summarization';
import type { SummarizeColumnsInput, SummarizeColumnsOutput } from '@/ai/flows/column-summarization';

export async function getColumnSummaries(input: SummarizeColumnsInput): Promise<SummarizeColumnsOutput> {
  try {
    const summaries = await summarizeColumns(input);
    return summaries;
  } catch (error) {
    console.error('Error getting column summaries:', error);
    // In a real app, you might want to return a more structured error object
    throw new Error('Failed to generate column summaries.');
  }
}
