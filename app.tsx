// Ask Pro — frontend entry.
//
// Registers the `ask-pro-question` pending-interaction renderer. When the
// backend's AskUserQuestionPro tool calls `bb.ui.requestInput` with this
// rendererId, BB replaces the thread composer with <AskProForm>; its
// `submit(value)` returns the answer to the waiting tool call.
import {
  definePluginApp,
  type JsonValue,
  type PluginPendingInteractionProps,
} from "@get-bb/plugin-sdk/app";

import { AskProForm } from "@/components/AskProForm";
import { RENDERER_ID } from "@/src/constants";
import type { InteractionPayload } from "@/src/types";

/** Narrow the untrusted JSON payload to our shape before rendering. */
function asPayload(payload: JsonValue): InteractionPayload | null {
  if (
    payload !== null &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    (payload as { kind?: unknown }).kind === "user_question" &&
    Array.isArray((payload as { questions?: unknown }).questions)
  ) {
    return payload as unknown as InteractionPayload;
  }
  return null;
}

function AskProInteraction({
  interaction,
  submit,
  cancel,
}: PluginPendingInteractionProps) {
  const payload = asPayload(interaction.payload);
  if (payload === null) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-destructive">
        Ask Pro could not read this question.
      </div>
    );
  }
  return (
    <AskProForm
      key={interaction.id}
      payload={payload}
      submit={(value) => submit(value as unknown as JsonValue)}
      cancel={cancel}
    />
  );
}

export default definePluginApp((app) => {
  app.slots.pendingInteraction({
    id: RENDERER_ID,
    component: AskProInteraction,
  });
});
