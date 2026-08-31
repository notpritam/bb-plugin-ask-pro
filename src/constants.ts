// Shared constants for the Ask Pro tool + renderer.

/** Agent-facing tool name. Distinct from the native `AskUserQuestion` so it can
 *  coexist with a provider's built-in one; agents are steered here via the
 *  tool's `instructions` and the bundled skill. */
export const TOOL_NAME = "AskUserQuestionPro";

/** Must match the `pendingInteraction` slot id registered in app.tsx, and the
 *  `rendererId` passed to `bb.ui.requestInput`. `/^[a-zA-Z0-9_-]+$/`. */
export const RENDERER_ID = "ask-pro-question";

export const MAX_QUESTIONS = 4;
export const MAX_OPTIONS = 4;
export const MAX_OPTION_PREVIEW_LENGTH = 4000;

/** requestInput payloads are capped at 64 KiB; stay under with headroom. */
export const MAX_INTERACTION_PAYLOAD_BYTES = 60 * 1024;
