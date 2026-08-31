// One question: its options plus the automatic "Something else" free-text row.
import { OptionRow } from "@/components/OptionRow";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { InteractionQuestion } from "@/src/types";

export interface QuestionState {
  selected: string[];
  freeText: string;
  otherOpen: boolean;
  optionNotes: Record<string, string>;
  notesOpen: Record<string, boolean>;
}

export function QuestionBlock({
  question,
  index,
  total,
  state,
  disabled,
  onToggleOption,
  onToggleOther,
  onFreeTextChange,
  onOpenNote,
  onNoteChange,
}: {
  question: InteractionQuestion;
  index: number;
  total: number;
  state: QuestionState;
  disabled: boolean;
  onToggleOption: (value: string) => void;
  onToggleOther: () => void;
  onFreeTextChange: (value: string) => void;
  onOpenNote: (value: string) => void;
  onNoteChange: (value: string, note: string) => void;
}) {
  const options = question.options ?? [];
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {question.shortLabel ? (
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
            {question.shortLabel}
          </span>
        ) : null}
        <span className="text-sm font-medium leading-snug text-foreground">
          {question.prompt}
        </span>
        {total > 1 ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {index + 1}/{total}
          </span>
        ) : null}
        {question.multiSelect ? (
          <span className="text-[11px] text-muted-foreground">· choose any</span>
        ) : null}
      </legend>

      <div className="flex flex-col gap-1">
        {options.map((option) => (
          <OptionRow
            key={option.value}
            option={option}
            multiSelect={question.multiSelect}
            selected={state.selected.includes(option.value)}
            note={state.optionNotes[option.value] ?? ""}
            noteOpen={state.notesOpen[option.value] === true}
            disabled={disabled}
            onToggle={() => onToggleOption(option.value)}
            onOpenNote={() => onOpenNote(option.value)}
            onNoteChange={(note) => onNoteChange(option.value, note)}
          />
        ))}

        {question.allowFreeText ? (
          <div
            className={cn(
              "rounded-md border transition-colors duration-150",
              state.otherOpen ? "border-foreground/30 bg-state-active" : "border-border",
            )}
          >
            <button
              type="button"
              role={question.multiSelect ? "checkbox" : "radio"}
              aria-checked={state.otherOpen}
              disabled={disabled}
              onClick={onToggleOther}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                "active:bg-state-active disabled:pointer-events-none disabled:opacity-50",
                !state.otherOpen && "hover:bg-state-hover",
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center border transition-colors",
                  question.multiSelect ? "rounded-[5px]" : "rounded-full",
                  state.otherOpen
                    ? "border-foreground bg-foreground text-background"
                    : "border-input group-hover:border-foreground/50",
                )}
                aria-hidden="true"
              >
                {state.otherOpen && !question.multiSelect ? (
                  <span className="size-1.5 rounded-full bg-background" />
                ) : null}
              </span>
              <span
                className={cn(
                  "text-sm",
                  state.otherOpen ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                Something else…
              </span>
            </button>
            {state.otherOpen ? (
              <div className="px-2.5 pb-2">
                <Textarea
                  value={state.freeText}
                  disabled={disabled}
                  onChange={(event) => onFreeTextChange(event.target.value)}
                  placeholder="Type your own answer…"
                  className="min-h-[36px] px-2 py-1.5 text-xs motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
                  data-ask-pro-field="true"
                  autoFocus
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}
