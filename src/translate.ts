// The pure translate layer: model input → interaction payload, and the user's
// response → the tool result the model reads. Copied from BB's built-in
// ask-user-question plugin, extended so each selected option can carry an inline
// context note and the whole form can carry a trailing "additional info" note.

import {
  MAX_INTERACTION_PAYLOAD_BYTES,
  MAX_OPTION_PREVIEW_LENGTH,
} from "./constants";
import { NOT_UNIQUE_MESSAGE, TOO_FEW_OPTIONS_MESSAGE } from "./tool-definition";
import type { ToolInput } from "./contracts";
import type {
  InteractionAnswer,
  InteractionPayload,
  InteractionQuestion,
  InteractionResponse,
} from "./types";

export function validateToolInput(input: ToolInput): string | null {
  if (input.questions.some((question) => question.options.length < 2)) {
    return TOO_FEW_OPTIONS_MESSAGE;
  }
  const prompts = input.questions.map((question) => question.question);
  if (new Set(prompts).size !== prompts.length) return NOT_UNIQUE_MESSAGE;
  for (const question of input.questions) {
    const labels = question.options.map((option) => option.label);
    if (new Set(labels).size !== labels.length) return NOT_UNIQUE_MESSAGE;
  }
  return null;
}

export class PayloadTooLargeError extends Error {
  constructor(byteLength: number) {
    super(
      `The questions are too large to display (${byteLength} bytes, limit ${MAX_INTERACTION_PAYLOAD_BYTES}). Shorten or drop the option previews and call the tool again.`,
    );
    this.name = "PayloadTooLargeError";
  }
}

export function questionId(index: number): string {
  return `q${index}`;
}

export function optionValue(index: number, optionIndex: number): string {
  return `${questionId(index)}o${optionIndex}`;
}

function normalizePreview(preview: string | undefined): string | undefined {
  if (preview === undefined) return undefined;
  const trimmed = preview.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, MAX_OPTION_PREVIEW_LENGTH);
}

export function buildInteractionPayload(input: ToolInput): InteractionPayload {
  return {
    kind: "user_question",
    allowAdditionalInfo: true,
    questions: input.questions.map((question, index) => ({
      id: questionId(index),
      prompt: question.question,
      shortLabel: question.header,
      multiSelect: question.multiSelect,
      allowFreeText: true,
      allowOptionNotes: true,
      options: question.options.map((option, optionIndex) => {
        const preview = question.multiSelect
          ? undefined
          : normalizePreview(option.preview);
        return {
          value: optionValue(index, optionIndex),
          label: option.label,
          description: option.description,
          ...(preview === undefined ? {} : { preview }),
        };
      }),
    })),
  };
}

export function assertInteractionPayloadFits(payload: InteractionPayload): void {
  const byteLength = new TextEncoder().encode(JSON.stringify(payload)).length;
  if (byteLength > MAX_INTERACTION_PAYLOAD_BYTES) {
    throw new PayloadTooLargeError(byteLength);
  }
}

export function buildInteractionTitle(payload: InteractionPayload): string {
  const [first] = payload.questions;
  if (payload.questions.length === 1 && first) {
    return first.shortLabel ?? first.prompt;
  }
  return `${payload.questions.length} questions`;
}

function selectedOptions(question: InteractionQuestion, answer: InteractionAnswer) {
  const options = question.options ?? [];
  return answer.selected.flatMap((value) => {
    const option = options.find((candidate) => candidate.value === value);
    return option === undefined ? [] : [option];
  });
}

/** One option's text, with its context note inlined: `Label (context: …)`. */
function optionText(
  label: string,
  value: string,
  optionNotes: Record<string, string> | undefined,
): string {
  const note = optionNotes?.[value]?.trim();
  return note ? `${label} (context: ${note})` : label;
}

/** The human-readable answer string the model reads for one question: each
 *  selected option with its inline note, joined, then any free-text. */
export function buildAnswerText(
  question: InteractionQuestion,
  answer: InteractionAnswer,
): string {
  const parts = selectedOptions(question, answer).map((option) =>
    optionText(option.label, option.value, answer.optionNotes),
  );
  const freeText = answer.freeText?.trim();
  if (parts.length > 0) {
    const selectedText = parts.join("; ");
    return freeText ? `${selectedText}; ${freeText}` : selectedText;
  }
  return freeText ?? "";
}

/** Structured extras beside the readable string: the per-option notes as a
 *  { label: note } map, the free-text-as-note (multiSelect only, like the
 *  built-in), and previews of the selected options. */
function buildAnnotation(question: InteractionQuestion, answer: InteractionAnswer) {
  const chosen = selectedOptions(question, answer);
  const optionNotes: Record<string, string> = {};
  for (const option of chosen) {
    const note = answer.optionNotes?.[option.value]?.trim();
    if (note) optionNotes[option.label] = note;
  }
  const freeText = answer.freeText?.trim();
  const notes = answer.selected.length > 0 && freeText ? freeText : undefined;
  const previews = chosen.flatMap((option) =>
    option.preview === undefined ? [] : [option.preview],
  );
  const preview = previews.length > 0 ? previews.join("\n\n") : undefined;
  const hasOptionNotes = Object.keys(optionNotes).length > 0;
  if (notes === undefined && preview === undefined && !hasOptionNotes) return null;
  return {
    ...(hasOptionNotes ? { optionNotes } : {}),
    ...(preview === undefined ? {} : { preview }),
    ...(notes === undefined ? {} : { notes }),
  };
}

export interface ToolResult {
  questions: Array<{
    question: string;
    header?: string;
    options: Array<{ label: string; description: string; preview?: string }>;
    multiSelect: boolean;
  }>;
  answers: Record<string, string>;
  response?: string;
  additionalInfo?: string;
  annotations?: Record<string, ReturnType<typeof buildAnnotation>>;
}

export function buildToolResult(
  payload: InteractionPayload,
  response: InteractionResponse,
): ToolResult {
  const answers: Record<string, string> = {};
  const annotations: Record<string, ReturnType<typeof buildAnnotation>> = {};
  let freeformResponse: string | undefined;

  for (const question of payload.questions) {
    const answer = response.answers[question.id];
    if (answer === undefined) continue;
    const text = buildAnswerText(question, answer);
    if (text.length === 0) continue;
    answers[question.prompt] = text;
    if (
      payload.questions.length === 1 &&
      answer.selected.length === 0 &&
      answer.freeText !== undefined &&
      answer.freeText.trim().length > 0
    ) {
      freeformResponse = answer.freeText.trim();
    }
    const annotation = buildAnnotation(question, answer);
    if (annotation !== null) annotations[question.prompt] = annotation;
  }

  const additionalInfo = response.additionalInfo?.trim();

  return {
    questions: payload.questions.map((question) => ({
      question: question.prompt,
      ...(question.shortLabel === undefined ? {} : { header: question.shortLabel }),
      options: (question.options ?? []).map((option) => ({
        label: option.label,
        description: option.description ?? option.label,
        ...(option.preview === undefined ? {} : { preview: option.preview }),
      })),
      multiSelect: question.multiSelect,
    })),
    answers,
    ...(freeformResponse === undefined ? {} : { response: freeformResponse }),
    ...(additionalInfo ? { additionalInfo } : {}),
    ...(Object.keys(annotations).length > 0 ? { annotations } : {}),
  };
}
