
'use server';
/**
 * @fileOverview A text translation AI flow.
 *
 * - translateText - A function that handles the translation of text into multiple languages.
 * - TranslateInput - The input type for the translateText function.
 * - TranslateOutput - The return type for the translateText function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateInputSchema = z.object({
  textToTranslate: z.string().describe('The text that needs to be translated.'),
  sourceLanguage: z.string().describe('The source language of the text, e.g., "English".'),
  targetLanguages: z.array(z.string()).describe('An array of target languages to translate the text into, e.g., ["Oromo", "Amharic"].'),
});
export type TranslateInput = z.infer<typeof TranslateInputSchema>;

const TranslateOutputSchema = z.record(z.string(), z.string()).describe('An object where keys are the target languages and values are the translated strings.');
export type TranslateOutput = z.infer<typeof TranslateOutputSchema>;

export async function translateText(input: TranslateInput): Promise<TranslateOutput> {
  return translateFlow(input);
}

const translatePrompt = ai.definePrompt({
  name: 'translatePrompt',
  input: { schema: TranslateInputSchema },
  output: { schema: TranslateOutputSchema },
  prompt: `You are an expert translator specializing in English, Oromo (Oromifaa), and Amharic.
  Translate the following text from {{sourceLanguage}} into each of the target languages specified.
  
  Source Text:
  "{{textToTranslate}}"
  
  Target Languages:
  {{#each targetLanguages}}
  - {{{this}}}
  {{/each}}
  
  Your response MUST be a valid JSON object where the keys are the target languages and the values are the translated strings.
  For example, if the target languages are "Oromo" and "Amharic", the output should look like:
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
