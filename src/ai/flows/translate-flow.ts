
'use server';
/**
 * @fileOverview A text translation AI flow.
 *
 * - translateText - A function that handles the translation of text into Oromo and Amharic.
 * - TranslateInput - The input type for the translateText function.
 * - TranslateOutput - The return type for the translateText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateInputSchema = z.object({
  textToTranslate: z.string().describe('The text that needs to be translated.'),
  sourceLanguage: z.string().describe('The source language of the text, e.g., "English".'),
});
export type TranslateInput = z.infer<typeof TranslateInputSchema>;

const TranslateOutputSchema = z.object({
  Oromo: z.string().describe("The translated text in Oromo language."),
  Amharic: z.string().describe("The translated text in Amharic language."),
});
export type TranslateOutput = z.infer<typeof TranslateOutputSchema>;

export async function translateText(input: TranslateInput): Promise<TranslateOutput> {
  return translateFlow(input);
}

const translatePrompt = ai.definePrompt({
  name: 'translatePrompt',
  input: { schema: TranslateInputSchema },
  output: { schema: TranslateOutputSchema },
  prompt: `You are an expert translator specializing in English, Oromo (Oromifaa), and Amharic.
  Translate the following text from {{sourceLanguage}} into Oromo and Amharic.
  
  Source Text:
  "{{textToTranslate}}"
  
  Your response MUST be a valid JSON object with the keys "Oromo" and "Amharic", and the translated strings as their respective values.
  Example:
  {
    "Oromo": "...",
    "Amharic": "..."
  }
  `,
});

const translateFlow = ai.defineFlow(
  {
    name: 'translateFlow',
    inputSchema: TranslateInputSchema,
    outputSchema: TranslateOutputSchema,
  },
  async (input) => {
    const { output } = await translatePrompt(input);
    if (!output) {
        throw new Error("Translation flow did not produce an output.");
    }
    return output;
  }
);
