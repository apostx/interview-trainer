"use client";

import type { RubricItem, RubricStatus } from "@/core/models";

const STATUS_META: Record<
  RubricStatus,
  { icon: string; label: string; textClass: string }
> = {
  covered: { icon: "✅", label: "Covered", textClass: "text-good-text" },
  weak: { icon: "⚠️", label: "Weak", textClass: "text-foreground" },
  missing: { icon: "❌", label: "Missing", textClass: "text-critical" },
};

function statusOf(
  itemId: string,
  covered: string[],
  weak: string[],
): RubricStatus {
  if (covered.includes(itemId)) return "covered";
  if (weak.includes(itemId)) return "weak";
  return "missing";
}

/**
 * Review checklist (spec §11.4): every rubric item shows its status and can
 * be manually overridden with one tap.
 */
export function RubricChecklist({
  items,
  coveredIds,
  weakIds,
  semanticIds = [],
  onOverride,
}: {
  items: RubricItem[];
  coveredIds: string[];
  weakIds: string[];
  /** Items credited via semantic (meaning-based) matching. */
  semanticIds?: string[];
  onOverride?: (rubricItemId: string, newStatus: RubricStatus) => void;
}) {
  return (
    <ul className="divide-y divide-hairline">
      {items.map((item) => {
        const status = statusOf(item.id, coveredIds, weakIds);
        const meta = STATUS_META[status];
        return (
          <li key={item.id} className="flex flex-col gap-2 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span aria-hidden>{meta.icon}</span>
                  <span>{item.label}</span>
                  {item.importance === "critical" && (
                    <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                      critical
                    </span>
                  )}
                  {semanticIds.includes(item.id) && (
                    <span
                      className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-accent"
                      title="Credited by meaning, not exact keywords"
                    >
                      ≈ meaning
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-secondary">{item.description}</p>
              </div>
              <span className={`shrink-0 text-xs font-semibold ${meta.textClass}`}>
                {meta.label}
              </span>
            </div>
            {onOverride && (
              <div
                className="flex gap-1"
                role="group"
                aria-label={`Override status for ${item.label}`}
              >
                {(["covered", "weak", "missing"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onOverride(item.id, s)}
                    aria-pressed={status === s}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      status === s
                        ? "bg-accent text-white"
                        : "border border-hairline text-secondary hover:text-foreground"
                    }`}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
