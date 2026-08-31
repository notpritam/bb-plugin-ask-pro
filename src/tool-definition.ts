// The agent-facing tool description, the advertised JSON schema, and the
// steering copy. Based on BB's built-in AskUserQuestion, with the two Ask Pro
// capabilities documented so the model knows what the user can do with its
// question.

export const TOOL_DESCRIPTION = `Ask the user a multiple-choice question when you are blocked on a decision that is genuinely theirs to make: one you cannot resolve from the request, the code, or sensible defaults.

Prefer this tool over asking in prose: it renders as an interactive form and, unlike a plain AskUserQuestion, it lets the user (a) attach freeform context to any specific option they pick, and (b) add a final "anything else" note after answering. You will receive that context inline with each chosen option, plus any additional note.

Usage notes:
- Users can always select "Other" to type a custom answer for a question.
- Users can attach a short context note to any option they select — you do not need to add an option for that. Read those notes: they refine the choice.
- Use multiSelect: true when a question's choices are not mutually exclusive.
- If you recommend a specific option, make it the first option and add "(Recommended)" at the end of its label.
- There is no "Other" option to include yourself — it is provided automatically.

Reserve this for decisions where the user's answer changes what you do next — not for choices with a conventional default or facts you can verify yourself. In those cases pick the obvious option, say so, and proceed.

Preview feature:
Use the optional \`preview\` field on an option when the user needs to visually compare concrete artifacts (ASCII UI mockups, code snippets, config examples). Preview content renders as markdown in a monospace box, revealed beneath an option once it is selected. Previews are single-select only.`;

export const TOOL_INSTRUCTIONS =
  "When you need the user to choose between two or more genuine options, prefer AskUserQuestionPro over asking in prose. Users can attach context to any option they pick and add a closing note — incorporate both into what you do next.";

export const TOO_FEW_OPTIONS_MESSAGE =
  "This call included a question with fewer than 2 options, so it was rejected and the person never saw it. A question with a single option has no decision in it. Do not retry this call and do not invent a filler second option. Instead, state the one path you were going to offer as the approach you are taking, then continue with the task. If this call also contained questions with 2 to 4 options (each with distinct labels), you may re-ask those questions alone in a new call. Ask a question only when the person has at least two genuinely distinct choices.";

export const NOT_UNIQUE_MESSAGE =
  "Question texts must be unique, option labels must be unique within each question";

export function buildTimeoutMessage(elapsedMs: number): string {
  return `No response after ${Math.round(elapsedMs / 1000)}s — the user may be away from keyboard. Proceed using your best judgment based on the context so far; you can re-ask this question later if it's still relevant.`;
}

export const TOOL_INPUT_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  additionalProperties: false,
  properties: {
    questions: {
      description: "Questions to ask the user (1-4 questions)",
      items: {
        additionalProperties: false,
        properties: {
          question: {
            description:
              'The complete question to ask the user. Should be clear, specific, and end with a question mark. Example: "Which library should we use for date formatting?" If multiSelect is true, phrase it accordingly, e.g. "Which features do you want to enable?"',
            type: "string",
          },
          header: {
            description:
              'Very short label displayed as a chip/tag (max 12 chars). Examples: "Auth method", "Library", "Approach".',
            type: "string",
          },
          multiSelect: {
            default: false,
            description:
              "Set to true to allow the user to select multiple options instead of just one. Use when choices are not mutually exclusive.",
            type: "boolean",
          },
          options: {
            description:
              "The available choices for this question. Must have 2-4 options. Each option should be a distinct, mutually exclusive choice (unless multiSelect is enabled). Do not add an 'Other' option or a 'let me explain' option — the user gets a free-text 'Other' row and can attach a context note to any option automatically.",
            items: {
              additionalProperties: false,
              properties: {
                label: {
                  description:
                    "The display text for this option that the user will see and select. Should be concise (1-5 words) and clearly describe the choice.",
                  type: "string",
                },
                description: {
                  description:
                    "Explanation of what this option means or what will happen if chosen. Useful for providing context about trade-offs or implications.",
                  type: "string",
                },
                preview: {
                  description:
                    "Optional preview content rendered when this option is selected. Use for mockups, code snippets, or visual comparisons that help users compare options. Single-select questions only.",
                  type: "string",
                },
              },
              required: ["label", "description"],
              type: "object",
            },
            maxItems: 4,
            minItems: 2,
            type: "array",
          },
        },
        required: ["question", "header", "options", "multiSelect"],
        type: "object",
      },
      maxItems: 4,
      minItems: 1,
      type: "array",
    },
  },
  required: ["questions"],
  type: "object",
} as const;
