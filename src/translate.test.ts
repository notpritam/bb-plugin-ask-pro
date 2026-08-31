import { describe, expect, it } from "vitest";

import { toolInputSchema } from "./contracts";
import {
  buildInteractionPayload,
  buildToolResult,
  validateToolInput,
} from "./translate";
import type { InteractionResponse } from "./types";

function parse(raw: unknown) {
  return toolInputSchema.parse(raw);
}

const DB_QUESTION = {
  question: "Which database?",
  header: "DB",
  multiSelect: false,
  options: [
    { label: "Postgres", description: "Relational, we run it already" },
    { label: "SQLite", description: "Zero-ops, single file", preview: "code()" },
  ],
};

describe("buildInteractionPayload", () => {
  it("maps questions and options, enabling the Ask Pro affordances", () => {
    const payload = buildInteractionPayload(parse({ questions: [DB_QUESTION] }));
    expect(payload.kind).toBe("user_question");
    expect(payload.allowAdditionalInfo).toBe(true);

    const [q] = payload.questions;
    expect(q.id).toBe("q0");
    expect(q.prompt).toBe("Which database?");
    expect(q.shortLabel).toBe("DB");
    expect(q.allowFreeText).toBe(true);
    expect(q.allowOptionNotes).toBe(true);
    expect(q.options?.map((o) => o.value)).toEqual(["q0o0", "q0o1"]);
    // Single-select keeps previews.
    expect(q.options?.[1].preview).toBe("code()");
  });

  it("drops option previews on multiSelect questions", () => {
    const payload = buildInteractionPayload(
      parse({
        questions: [{ ...DB_QUESTION, multiSelect: true }],
      }),
    );
    expect(payload.questions[0].options?.[1].preview).toBeUndefined();
  });
});

describe("buildToolResult — per-option context", () => {
  it("inlines a single selected option's note", () => {
    const payload = buildInteractionPayload(parse({ questions: [DB_QUESTION] }));
    const response: InteractionResponse = {
      answers: { q0: { selected: ["q0o0"], optionNotes: { q0o0: "already run it" } } },
    };
    const result = buildToolResult(payload, response);
    expect(result.answers["Which database?"]).toBe(
      "Postgres (context: already run it)",
    );
    expect(result.annotations?.["Which database?"]).toEqual({
      optionNotes: { Postgres: "already run it" },
    });
  });

  it("joins multiple selections and only inlines non-empty notes", () => {
    const payload = buildInteractionPayload(
      parse({
        questions: [
          {
            question: "Which features?",
            header: "Feats",
            multiSelect: true,
            options: [
              { label: "Auth", description: "d" },
              { label: "Billing", description: "d" },
              { label: "Search", description: "d" },
            ],
          },
        ],
      }),
    );
    const response: InteractionResponse = {
      answers: {
        q0: { selected: ["q0o0", "q0o2"], optionNotes: { q0o0: "OAuth only", q0o2: "  " } },
      },
    };
    const result = buildToolResult(payload, response);
    expect(result.answers["Which features?"]).toBe(
      "Auth (context: OAuth only); Search",
    );
  });
});

describe("buildToolResult — additional info and free text", () => {
  it("surfaces the closing note at the top level", () => {
    const payload = buildInteractionPayload(parse({ questions: [DB_QUESTION] }));
    const response: InteractionResponse = {
      answers: { q0: { selected: ["q0o1"] } },
      additionalInfo: "keep the option to migrate later",
    };
    const result = buildToolResult(payload, response);
    expect(result.answers["Which database?"]).toBe("SQLite");
    expect(result.additionalInfo).toBe("keep the option to migrate later");
  });

  it("treats a single-question Other-only answer as a freeform response", () => {
    const payload = buildInteractionPayload(
      parse({
        questions: [
          {
            question: "Approach?",
            header: "App",
            multiSelect: false,
            options: [
              { label: "Rewrite", description: "d" },
              { label: "Patch", description: "d" },
            ],
          },
        ],
      }),
    );
    const response: InteractionResponse = {
      answers: { q0: { selected: [], freeText: "spike it first" } },
    };
    const result = buildToolResult(payload, response);
    expect(result.answers["Approach?"]).toBe("spike it first");
    expect(result.response).toBe("spike it first");
  });

  it("keeps additionalInfo even when no question was answered", () => {
    const payload = buildInteractionPayload(parse({ questions: [DB_QUESTION] }));
    const result = buildToolResult(payload, {
      answers: {},
      additionalInfo: "proceed carefully",
    });
    expect(Object.keys(result.answers)).toHaveLength(0);
    expect(result.additionalInfo).toBe("proceed carefully");
  });
});

describe("validateToolInput", () => {
  it("rejects a question with fewer than two options", () => {
    const input = parse({
      questions: [
        { question: "Q?", header: "H", multiSelect: false, options: [{ label: "A", description: "d" }] },
      ],
    });
    expect(validateToolInput(input)).toContain("fewer than 2 options");
  });

  it("rejects duplicate option labels", () => {
    const input = parse({
      questions: [
        {
          question: "Q?",
          header: "H",
          multiSelect: false,
          options: [
            { label: "A", description: "d" },
            { label: "A", description: "e" },
          ],
        },
      ],
    });
    expect(validateToolInput(input)).toContain("unique");
  });

  it("accepts a well-formed question", () => {
    const input = parse({
      questions: [
        {
          question: "Q?",
          header: "H",
          multiSelect: false,
          options: [
            { label: "A", description: "d" },
            { label: "B", description: "e" },
          ],
        },
      ],
    });
    expect(validateToolInput(input)).toBeNull();
  });
});
