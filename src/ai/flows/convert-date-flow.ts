
'use server';
/**
 * @fileOverview A date conversion AI flow.
 *
 * - convertToEthiopianDate - A function that handles the conversion of a Gregorian date to Ethiopian.
 * - ConvertDateInput - The input type for the convertToEthiopianDate function.
 * - ConvertDateOutput - The return type for the convertToEthiopianDate function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ConvertDateInputSchema = z.object({
  gregorianDate: z.string().describe('The Gregorian date string to convert, e.g., "2024-08-18".'),
});
export type ConvertDateInput = z.infer<typeof ConvertDateInputSchema>;

const ConvertDateOutputSchema = z.string().describe("The converted Ethiopian date in 'Month Day, Year' format, e.g., 'Nehase 12, 2016'.");
export type ConvertDateOutput = z.infer<typeof ConvertDateOutputSchema>;

export async function convertToEthiopianDate(input: ConvertDateInput): Promise<ConvertDateOutput> {
  return convertDateFlow(input);
}

const convertDatePrompt = ai.definePrompt({
  name: 'convertDatePrompt',
  input: { schema: ConvertDateInputSchema },
  output: { schema: ConvertDateOutputSchema },
  prompt: `You are an expert in world calendar systems. Convert the following Gregorian date '{{gregorianDate}}' into the Ethiopian calendar date. 
  
  Your response MUST be ONLY the date string in the format "Month Day, Year".
  
  For example, if the input is '2024-08-18', the output should be 'Nehase 12, 2016'.
  Do not include the day of the week or any other information.
  `,
});

const convertDateFlow = ai.defineFlow(
  {
    name: 'convertDateFlow',
    inputSchema: ConvertDateInputSchema,
    outputSchema: ConvertDateOutputSchema,
  },
  async (input) => {
    const { output } = await convertDatePrompt(input);
    if (!output) {
        throw new Error("Date conversion flow did not produce an output.");
    }
    return output;
  }
);
