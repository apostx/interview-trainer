"use client";

import { useEffect, useRef } from "react";
import { allBanks } from "@/core/content/bank";
import { selectCompact } from "@/components/ui";

/** Importance levels for the multi-select filter ("u" = unrated topics). */
export const IMPORTANCE_LEVELS: { id: string; name: string }[] = [
  { id: "5", name: "Essential (5)" },
  { id: "4", name: "High (4)" },
  { id: "3", name: "Medium (3)" },
  { id: "2", name: "Low (2)" },
  { id: "1", name: "Niche (1)" },
  { id: "u", name: "Unrated" },
];

export function importanceSummary(selected: string[]): string {
  if (selected.length === 0) return "All topics";
  if (selected.length === 1)
    return (
      IMPORTANCE_LEVELS.find((l) => l.id === selected[0])?.name ?? selected[0]
    );
  return `${selected.length} levels`;
}

/** Multi-select dropdown of (optionally grouped) checkboxes. */
export function CheckboxDropdown({
  ariaLabel,
  allLabel,
  summary,
  groups,
  selected,
  onChange,
}: {
  ariaLabel: string;
  allLabel: string;
  summary: string;
  groups: [string, { id: string; name: string }[]][];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  // A native <details> stays open on outside clicks; close it like a select.
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = ref.current;
      if (el?.open && e.target instanceof Node && !el.contains(e.target)) {
        el.open = false;
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) ref.current.open = false;
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  return (
    <details ref={ref} className="relative">
      <summary
        className={`${selectCompact} max-w-56 cursor-pointer list-none select-none truncate [&::-webkit-details-marker]:hidden`}
        aria-label={ariaLabel}
      >
        {summary} ▾
      </summary>
      <div className="absolute left-0 z-20 mt-1 max-h-80 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-hairline bg-surface p-2 shadow-lg">
        <button
          type="button"
          onClick={() => onChange([])}
          className={`mb-1 w-full rounded px-2 py-1.5 text-left text-sm ${
            selected.length === 0
              ? "font-semibold text-accent"
              : "text-secondary hover:text-foreground"
          }`}
        >
          {allLabel}
        </button>
        {groups.map(([group, entries]) => (
          <div key={group || "(root)"}>
            {group !== "" && (
              <p className="mt-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {group}
              </p>
            )}
            {entries.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-background"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="truncate">{s.name}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

/** Dev-mode (?dev=1) bank switcher for comparing content versions. */
export function DevVersionSwitcher({
  versionLabel,
  onSelect,
  onExit,
}: {
  versionLabel: string;
  onSelect: (label: string) => void;
  onExit: () => void;
}) {
  if (allBanks.length < 2) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-hairline bg-background px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
        Dev · content version
      </span>
      <select
        className={selectCompact}
        value={versionLabel}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="Content version"
      >
        {allBanks.map((b) => (
          <option key={b.label} value={b.label}>
            {b.label} ({b.bank.topics.filter((t) => t.studyNotes).length} topics)
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onExit}
        className="text-xs text-muted underline hover:text-foreground"
      >
        Exit dev mode
      </button>
    </div>
  );
}
