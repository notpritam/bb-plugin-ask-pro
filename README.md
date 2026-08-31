# Ask Pro

An advanced ask-the-user form for BB — a richer take on the built-in
`AskUserQuestion`.

It registers an agent tool, **`AskUserQuestionPro`**, and its own
pending-interaction renderer. When an agent calls the tool, BB replaces the
composer with a multiple-choice form that adds two things the native form
doesn't have:

- **Per-option context** — after picking an option, the user can attach a short
  note to *that specific option*. The agent receives it inline, e.g.
  `Postgres (context: we already run it)`.
- **A closing note** — after answering, an "Anything else?" field whose text is
  returned as `additionalInfo`.

The core flow (tool registration → `bb.ui.requestInput` → translate the answer
back into a tool result) is copied from BB's built-in `ask-user-question`
plugin; the additions live in `src/translate.ts` and `components/`.

## Layout

- `server.ts` — registers the tool and drives the interaction.
- `src/` — contracts (zod), tool definition, and the pure translate layer
  (`translate.test.ts` covers it).
- `app.tsx` + `components/` — the `ask-pro-question` renderer.
- `skills/ask-pro/` — steers agents to prefer the tool.

## Develop

```sh
npm install
npm run typecheck
npm test
bb plugin install .   # then: bb plugin dev
```

## Notes

The tool is offered on every provider and agents are steered to it via the tool
instructions and the bundled skill. It does not replace a provider's *native*
`AskUserQuestion` (e.g. Claude's) — making the Pro form the default there would
require intercepting the native render path, which is a possible follow-up.
