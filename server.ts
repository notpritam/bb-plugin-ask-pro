// Ask Pro — backend entry.
//
// Registers the AskUserQuestionPro agent tool. When the model calls it, we open
// a blocking pending-interaction (rendered by app.tsx's `ask-pro-question`
// slot), wait for the user's answer, and translate it back into a tool result.
// The flow copies BB's built-in ask-user-question plugin; the difference lives
// in the payload/response shape (per-option notes + a trailing note) and in
// translate.ts.

import type { BbPluginApi, JsonValue } from "@get-bb/plugin-sdk";

import { RENDERER_ID, TOOL_NAME } from "./src/constants";
import { interactionResponseSchema, toolInputSchema } from "./src/contracts";
import {
  TOOL_DESCRIPTION,
  TOOL_INPUT_JSON_SCHEMA,
  TOOL_INSTRUCTIONS,
  buildTimeoutMessage,
} from "./src/tool-definition";
import {
  assertInteractionPayloadFits,
  buildInteractionPayload,
  buildInteractionTitle,
  buildToolResult,
  validateToolInput,
} from "./src/translate";

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export default function plugin(bb: BbPluginApi) {
  bb.log.info("loaded");

  bb.agents.registerTool({
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    instructions: TOOL_INSTRUCTIONS,
    // The question is fully represented by its interaction row; a duplicate
    // tool row beside it would read as noise, so clients collapse it.
    presentation: {
      label: { pending: "Asking a question", completed: "Asked a question" },
      suppress: true,
    },
    parameters: toolInputSchema,
    async execute(input, ctx) {
      const invalid = validateToolInput(input);
      if (invalid !== null) return errorResult(invalid);

      const payload = buildInteractionPayload(input);
      try {
        assertInteractionPayloadFits(payload);
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : String(error));
      }

      const askedAt = Date.now();
      let result;
      try {
        result = await bb.ui.requestInput(
          {
            threadId: ctx.threadId,
            rendererId: RENDERER_ID,
            title: buildInteractionTitle(payload),
            payload: payload as unknown as JsonValue,
          },
          { signal: ctx.signal },
        );
      } catch (error) {
        return errorResult(
          `The question could not be shown (${error instanceof Error ? error.message : String(error)}). Only one prompt can await the user at a time — put all of your questions in a single call, or continue with your best judgement.`,
        );
      }

      if (result.outcome === "cancelled") {
        return errorResult(
          result.reason === "timeout"
            ? buildTimeoutMessage(Date.now() - askedAt)
            : "The user dismissed the question without answering. Proceed with your best judgement, or ask again in your reply.",
        );
      }

      const parsed = interactionResponseSchema.safeParse(result.value);
      if (!parsed.success) {
        return errorResult(
          "The answer could not be read. Ask the question again in your reply instead.",
        );
      }

      const toolResult = buildToolResult(payload, parsed.data);
      if (
        Object.keys(toolResult.answers).length === 0 &&
        !toolResult.additionalInfo
      ) {
        return errorResult(
          "The user submitted no answers. Proceed with your best judgement, or ask again in your reply.",
        );
      }

      return JSON.stringify(toolResult);
    },
  });

  // Offer the tool on every provider. Unlike the built-in (which withholds from
  // providers with a native ask-user-question), we surface Ask Pro everywhere
  // because its per-option context and closing note are the whole point; the
  // tool `instructions` and the bundled skill steer the model to prefer it.
  bb.agents.configure(() => ({
    tools: [{ name: TOOL_NAME, parameters: TOOL_INPUT_JSON_SCHEMA }],
    skills: [],
  }));

  bb.onDispose(() => {
    bb.log.info("disposed");
  });
}
