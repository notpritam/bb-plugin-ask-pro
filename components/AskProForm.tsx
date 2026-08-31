// The Ask Pro form: renders every question in one compact view (like the native
// AskUserQuestion) and adds the two capabilities the native form lacks —
// per-option context notes (via OptionRow) and a subtle, collapsible closing
// note. Both are kept lightweight so neither reads as another question.
import { useCallback, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";

import { QuestionBlock, type QuestionState } from "@/components/QuestionBlock";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import type { InteractionPayload, InteractionResponse } from "@/src/types";

type FormState = Record<string, QuestionState>;

function initialState(payload: InteractionPayload): FormState {
  const state: FormState = {};
  for (const question of payload.questions) {
    state[question.id] = {
      selected: [],
      freeText: "",
      otherOpen: false,
      optionNotes: {},
      notesOpen: {},
    };
  }
  return state;
}

export function AskProForm({
  payload,
  submit,
  cancel,
}: {
  payload: InteractionPayload;
  submit: (value: InteractionResponse) => Promise<void>;
  cancel: () => Promise<void>;
}) {
  const [state, setState] = useState<FormState>(() => initialState(payload));
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchQuestion = useCallback(
    (qid: string, update: (prev: QuestionState) => QuestionState) => {
      setState((prev) => ({ ...prev, [qid]: update(prev[qid]) }));
    },
    [],
  );

  const toggleOption = useCallback(
    (qid: string, value: string) => {
      const multi = payload.questions.find((q) => q.id === qid)?.multiSelect;
      patchQuestion(qid, (prev) => {
        if (multi) {
          const selected = prev.selected.includes(value)
            ? prev.selected.filter((v) => v !== value)
            : [...prev.selected, value];
          return { ...prev, selected };
        }
        // Single-select: one pick replaces any other, and clears "Other".
        const selected = prev.selected.includes(value) ? [] : [value];
        return { ...prev, selected, otherOpen: false };
      });
    },
    [patchQuestion, payload.questions],
  );

  const toggleOther = useCallback(
    (qid: string) => {
      const multi = payload.questions.find((q) => q.id === qid)?.multiSelect;
      patchQuestion(qid, (prev) => {
        const otherOpen = !prev.otherOpen;
        if (otherOpen && !multi) return { ...prev, otherOpen, selected: [] };
        return { ...prev, otherOpen };
      });
    },
    [patchQuestion, payload.questions],
  );

  const setFreeText = useCallback(
    (qid: string, freeText: string) =>
      patchQuestion(qid, (prev) => ({ ...prev, freeText })),
    [patchQuestion],
  );

  const openNote = useCallback(
    (qid: string, value: string) =>
      patchQuestion(qid, (prev) => ({
        ...prev,
        notesOpen: { ...prev.notesOpen, [value]: true },
      })),
    [patchQuestion],
  );

  const setNote = useCallback(
    (qid: string, value: string, note: string) =>
      patchQuestion(qid, (prev) => ({
        ...prev,
        optionNotes: { ...prev.optionNotes, [value]: note },
      })),
    [patchQuestion],
  );

  const buildResponse = useCallback((): InteractionResponse => {
    const answers: InteractionResponse["answers"] = {};
    for (const question of payload.questions) {
      const st = state[question.id];
      const optionNotes: Record<string, string> = {};
      for (const value of st.selected) {
        const note = st.optionNotes[value]?.trim();
        if (note) optionNotes[value] = note;
      }
      const freeText = st.otherOpen ? st.freeText.trim() : "";
      answers[question.id] = {
        selected: st.selected,
        ...(freeText ? { freeText } : {}),
        ...(Object.keys(optionNotes).length > 0 ? { optionNotes } : {}),
      };
    }
    const extra = additionalInfo.trim();
    return { answers, ...(extra ? { additionalInfo: extra } : {}) };
  }, [additionalInfo, payload.questions, state]);

  const answeredCount = useMemo(
    () =>
      payload.questions.reduce((count, question) => {
        const st = state[question.id];
        const answered =
          st.selected.length > 0 || (st.otherOpen && st.freeText.trim().length > 0);
        return answered ? count + 1 : count;
      }, 0),
    [payload.questions, state],
  );
  const canSubmit =
    !busy && (answeredCount > 0 || additionalInfo.trim().length > 0);

  const onSubmit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await submit(buildResponse());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }, [buildResponse, busy, submit]);

  const onCancel = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await cancel();
    } catch {
      setBusy(false);
    }
  }, [busy, cancel]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      // Cmd/Ctrl+Enter submits from anywhere. Plain Enter is left alone so it
      // toggles a focused option and inserts newlines in the note fields.
      if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      if (canSubmit) void onSubmit();
    },
    [canSubmit, onSubmit],
  );

  const multiQuestion = payload.questions.length > 1;
  const showAdditional = additionalOpen || additionalInfo.length > 0;

  return (
    <div
      role="group"
      aria-label="Answer the agent's question"
      onKeyDown={onKeyDown}
      className="flex max-h-[55vh] w-full flex-col overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-4">
          {payload.questions.map((question, index) => (
            <QuestionBlock
              key={question.id}
              question={question}
              index={index}
              total={payload.questions.length}
              state={state[question.id]}
              disabled={busy}
              onToggleOption={(value) => toggleOption(question.id, value)}
              onToggleOther={() => toggleOther(question.id)}
              onFreeTextChange={(value) => setFreeText(question.id, value)}
              onOpenNote={(value) => openNote(question.id, value)}
              onNoteChange={(value, note) => setNote(question.id, value, note)}
            />
          ))}

          {payload.allowAdditionalInfo ? (
            <div className="min-w-0">
              {showAdditional ? (
                <Textarea
                  value={additionalInfo}
                  disabled={busy}
                  onChange={(event) => setAdditionalInfo(event.target.value)}
                  placeholder={
                    multiQuestion
                      ? "A note for all of the above (optional)…"
                      : "A note for the agent (optional)…"
                  }
                  className="min-h-[40px] px-2 py-1.5 text-xs motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
                  data-ask-pro-field="true"
                  autoFocus={additionalOpen && additionalInfo.length === 0}
                />
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setAdditionalOpen(true)}
                  className="inline-flex items-center gap-1 rounded text-[11px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:underline disabled:opacity-50"
                >
                  <Icon name="MessageSquarePlus" className="size-3" />
                  Add a note
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="px-3 pb-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {multiQuestion
            ? `${answeredCount}/${payload.questions.length} answered`
            : "⌘⏎ to send"}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onCancel()}
            disabled={busy}
          >
            Dismiss
          </Button>
          <Button size="sm" onClick={() => void onSubmit()} disabled={!canSubmit}>
            {busy ? "Sending…" : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
