---
name: ask-pro
description: Ask the user a decision they must make with the AskUserQuestionPro tool — an interactive multiple-choice form where the user can attach context to any option they pick and add a closing note. Use whenever you would otherwise ask the user to choose between options in prose.
---

# Asking the user with Ask Pro

When you are blocked on a decision that is genuinely the user's to make — one you
cannot resolve from the request, the code, or a sensible default — call the
**`AskUserQuestionPro`** tool instead of asking in prose.

## Why prefer it

`AskUserQuestionPro` renders an interactive form and gives the user two things a
plain question does not:

1. **Per-option context.** After picking an option, the user can attach a short
   note to *that specific option*. You receive it inline, e.g.
   `Postgres (context: we already run it for the main app)`.
2. **A closing note.** After answering, the user can add an "Anything else?"
   note that applies to the whole ask. You receive it as `additionalInfo`.

## How to call it

Pass 1–4 `questions`. Each question has a `question` (the full text), a short
`header` chip (≤12 chars), `multiSelect` (true when choices aren't mutually
exclusive), and 2–4 `options`, each with a `label` and a `description` of its
trade-off. Do **not** add an "Other" option or an "I'll explain" option — the
form always offers a free-text "Other" row and lets the user annotate any
option automatically.

Use an option's optional `preview` (markdown, single-select only) when the user
needs to visually compare concrete artifacts — ASCII mockups, code snippets, or
config examples.

## Reading the answer

The result is JSON: `answers` maps each question to the chosen option(s) with any
inline context, `annotations` carries the structured per-option notes, and
`additionalInfo` holds the closing note. Act on the notes — they refine the
choice, not just decorate it.

## When not to use it

Skip it for choices with a conventional default or facts you can verify
yourself. In those cases, pick the obvious option, say so, and continue.
