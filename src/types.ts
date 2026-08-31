// Pure, runtime-free shapes shared by the server (which builds the payload and
// reads the response) and the renderer (which consumes the payload and builds
// the response). No imports here, so app.tsx can `import type` from it with
// zero bundle cost.

/** One choice the user can pick. Mirrors the built-in AskUserQuestion option,
 *  so any consumer that already understands `user_question` payloads keeps
 *  working. */
export interface InteractionOption {
  /** Stable value used in the response's `selected` list and `optionNotes` map. */
  value: string;
  label: string;
  description?: string;
  /** Markdown preview, single-select questions only (matches the built-in). */
  preview?: string;
}

export interface InteractionQuestion {
  /** "q0", "q1", … */
  id: string;
  prompt: string;
  shortLabel?: string;
  multiSelect: boolean;
  /** Always true — the "Other" free-text row, like the native path. */
  allowFreeText: boolean;
  options?: InteractionOption[];
  /** NEW: the form shows an inline "Add context" note field on each selected
   *  option. Advisory to the renderer; the server always accepts notes. */
  allowOptionNotes: boolean;
}

/** Superset of the built-in `user_question` payload: same `kind` and question
 *  shape, plus the two Ask Pro affordances. Reusing the kind keeps Telegram /
 *  inbox reply routing working. */
export interface InteractionPayload {
  kind: "user_question";
  questions: InteractionQuestion[];
  /** NEW: the form shows a trailing "Anything else?" note field. */
  allowAdditionalInfo: boolean;
}

/** One question's answer. `selected` holds option `value`s; `optionNotes` maps
 *  a selected option's `value` to the context the user attached to it. */
export interface InteractionAnswer {
  selected: string[];
  freeText?: string;
  optionNotes?: Record<string, string>;
}

export interface InteractionResponse {
  answers: Record<string, InteractionAnswer>;
  additionalInfo?: string;
}
