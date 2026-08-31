// Zod contracts: the tool input the model sends, and the response the renderer
// submits back. Copied from BB's built-in ask-user-question plugin and extended
// with `optionNotes` (per-option context) and `additionalInfo` (a trailing note).

import { z } from "zod";

import { MAX_OPTIONS, MAX_OPTION_PREVIEW_LENGTH, MAX_QUESTIONS } from "./constants";

const nonBlank = (value: string) => value.trim().length > 0;

export const toolOptionSchema = z.object({
  label: z.string().min(1).refine(nonBlank, "Option labels cannot be blank"),
  description: z
    .string()
    .min(1)
    .refine(nonBlank, "Option descriptions cannot be blank"),
  preview: z.string().max(MAX_OPTION_PREVIEW_LENGTH).optional(),
});

export const toolQuestionSchema = z.object({
  question: z.string().min(1).refine(nonBlank, "Questions cannot be blank"),
  header: z.string().min(1).refine(nonBlank, "Headers cannot be blank"),
  // Looser than the advertised min 2: arity is enforced in validateToolInput so
  // a one-option question can return the steering message instead of a raw
  // schema error (mirrors the built-in).
  options: z.array(toolOptionSchema).min(1).max(MAX_OPTIONS),
  // Optional-with-default so a model that omits it gets a single-select
  // question rather than a validation error.
  multiSelect: z.boolean().default(false),
});

export const toolInputSchema = z.object({
  questions: z.array(toolQuestionSchema).min(1).max(MAX_QUESTIONS),
});

export type ToolInput = z.infer<typeof toolInputSchema>;

/** The response our renderer submits. Extra fields over the built-in are all
 *  optional, so a reply built by another consumer (e.g. the inbox plugin's
 *  Telegram bridge, which fills only `selected`/`freeText`) still validates. */
export const interactionAnswerSchema = z.object({
  selected: z.array(z.string()),
  freeText: z.string().optional(),
  optionNotes: z.record(z.string(), z.string()).optional(),
});

export const interactionResponseSchema = z.object({
  answers: z.record(z.string(), interactionAnswerSchema),
  additionalInfo: z.string().optional(),
});
