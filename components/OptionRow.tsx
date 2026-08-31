// One selectable option. Selecting it (a) records the choice and (b) reveals a
// small, inline "Add context" affordance so the user can attach a note to
// *this* option — kept subtle so it never reads as another question.
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { InteractionOption } from "@/src/types";

export function OptionRow({
  option,
  multiSelect,
  selected,
  note,
  noteOpen,
  disabled,
  onToggle,
  onOpenNote,
  onNoteChange,
}: {
  option: InteractionOption;
  multiSelect: boolean;
  selected: boolean;
  note: string;
  noteOpen: boolean;
  disabled: boolean;
  onToggle: () => void;
  onOpenNote: () => void;
  onNoteChange: (value: string) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-md border transition-colors duration-150",
        selected ? "border-foreground/30 bg-state-active" : "border-border",
      )}
    >
      <button
        type="button"
        role={multiSelect ? "checkbox" : "radio"}
        aria-checked={selected}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "group flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          "active:bg-state-active disabled:pointer-events-none disabled:opacity-50",
          !selected && "hover:bg-state-hover",
        )}
      >
        <span
          className={cn(
            "mt-px flex size-4 shrink-0 items-center justify-center border transition-colors",
            multiSelect ? "rounded-[5px]" : "rounded-full",
            selected
              ? "border-foreground bg-foreground text-background"
              : "border-input group-hover:border-foreground/50",
          )}
          aria-hidden="true"
        >
          {selected ? (
            multiSelect ? (
              <Icon name="Check" className="size-3" />
            ) : (
              <span className="size-1.5 rounded-full bg-background" />
            )
          ) : null}
        </span>
        <span className="min-w-0 flex-1 leading-snug">
          <span className={cn("text-sm text-foreground", selected && "font-medium")}>
            {option.label}
          </span>
          {option.description ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {option.description}
            </span>
          ) : null}
        </span>
      </button>

      {selected && option.preview ? (
        <pre className="mx-2.5 mb-2 max-h-48 overflow-auto rounded border border-border bg-muted/40 p-2 font-mono text-[11px] leading-snug text-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-150">
          {option.preview}
        </pre>
      ) : null}

      {selected ? (
        <div className="px-2.5 pb-2">
          {noteOpen || note ? (
            <Textarea
              value={note}
              disabled={disabled}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Add context for this choice (optional)…"
              className="min-h-[36px] rounded px-2 py-1.5 text-xs motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
              data-ask-pro-field="true"
              autoFocus={noteOpen && !note}
            />
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={onOpenNote}
              className="inline-flex items-center gap-1 rounded text-[11px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:underline disabled:opacity-50"
            >
              <Icon name="MessageSquarePlus" className="size-3" />
              Add context
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
