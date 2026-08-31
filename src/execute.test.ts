import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { describe, expect, it, vi } from "vitest";

import plugin from "../server";

const INPUT = {
  questions: [
    {
      question: "Which database?",
      header: "DB",
      multiSelect: false,
      options: [
        { label: "Postgres", description: "Relational" },
        { label: "SQLite", description: "Zero-ops" },
      ],
    },
  ],
};

async function driveTool(response: unknown) {
  const { bb, harness } = createFakePluginHost({ pluginId: "ask-pro" });
  await plugin(bb);
  const call = harness.behavior.callAgentTool("AskUserQuestionPro", INPUT, {
    threadId: "t1",
  });
  await vi.waitFor(() =>
    expect(harness.inspection.pendingInteractions.length).toBe(1),
  );
  const pending = harness.inspection.pendingInteractions[0];
  harness.behavior.submitInteraction(pending.id, response as never);
  return { result: await call, pending };
}

describe("AskUserQuestionPro execute", () => {
  it("opens the ask-pro-question interaction with the built payload", async () => {
    const { bb, harness } = createFakePluginHost({ pluginId: "ask-pro" });
    await plugin(bb);
    const call = harness.behavior.callAgentTool("AskUserQuestionPro", INPUT, {
      threadId: "t1",
    });
    await vi.waitFor(() =>
      expect(harness.inspection.pendingInteractions.length).toBe(1),
    );
    const pending = harness.inspection.pendingInteractions[0];
    expect(pending.rendererId).toBe("ask-pro-question");
    expect(pending.title).toBe("DB");
    harness.behavior.cancelInteraction(pending.id);
    const result = await call;
    // Cancelled → an error tool result the model can read.
    expect(result).toMatchObject({ isError: true });
  });

  it("returns a JSON result carrying the inline option note", async () => {
    const { result } = await driveTool({
      answers: { q0: { selected: ["q0o0"], optionNotes: { q0o0: "already run it" } } },
    });
    const parsed = JSON.parse(result as string);
    expect(parsed.answers["Which database?"]).toBe(
      "Postgres (context: already run it)",
    );
  });

  it("errors when the user submits nothing", async () => {
    const { result } = await driveTool({ answers: {} });
    expect(result).toMatchObject({ isError: true });
  });
});
