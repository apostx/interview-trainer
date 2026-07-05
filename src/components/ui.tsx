import type { ReactNode } from "react";
import type { InterviewMode } from "@/core/models";
import { MODE_LABELS } from "@/core/models";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-secondary">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-hairline bg-surface p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-secondary">{hint}</p>}
    </Card>
  );
}

/** Single-value meter (readiness, download progress). Sequential accent hue. */
export function ProgressMeter({
  value,
  label,
}: {
  value: number; // 0–100
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-hairline"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function ModeBadge({ mode }: { mode: InterviewMode }) {
  return (
    <span className="rounded-full border border-hairline bg-background px-2.5 py-0.5 text-xs font-medium text-secondary">
      {MODE_LABELS[mode]}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="rounded-lg bg-background px-2.5 py-1 text-sm font-bold tabular-nums">
      {score}%
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-secondary">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}

export const buttonPrimary =
  "rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed";
export const buttonSecondary =
  "rounded-lg border border-hairline bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed";
export const buttonGhost =
  "rounded-lg px-4 py-2.5 text-sm font-medium text-secondary hover:text-foreground hover:bg-background";
export const inputBase =
  "w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-sm text-foreground focus:outline-2 focus:outline-accent";
export const labelBase = "mb-1.5 block text-sm font-medium text-secondary";
