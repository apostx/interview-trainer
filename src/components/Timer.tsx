"use client";

import { useEffect, useState } from "react";

function format(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Counts down; shows 0:00 and switches tone when time is up. */
export function CountdownTimer({
  seconds,
  label,
  startedAt,
}: {
  seconds: number;
  label: string;
  startedAt: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const remaining = seconds - (now - startedAt) / 1000;
  const expired = remaining <= 0;
  return (
    <div
      className="flex items-baseline gap-2"
      role="timer"
      aria-label={`${label}: ${expired ? "time is up" : format(remaining)}`}
    >
      <span className="text-sm text-secondary">{label}</span>
      <span
        className={`font-mono text-2xl font-bold tabular-nums ${expired ? "text-critical" : ""}`}
      >
        {expired ? "0:00" : format(remaining)}
      </span>
      {expired && (
        <span className="text-sm font-medium text-critical">Time to answer</span>
      )}
    </div>
  );
}

/** Counts up; warns when past the expected duration. */
export function CountupTimer({
  expectedSeconds,
  label,
  startedAt,
}: {
  expectedSeconds: number;
  label: string;
  startedAt: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const elapsed = (now - startedAt) / 1000;
  const over = elapsed > expectedSeconds;
  return (
    <div className="flex items-baseline gap-2" role="timer" aria-label={label}>
      <span className="text-sm text-secondary">{label}</span>
      <span
        className={`font-mono text-2xl font-bold tabular-nums ${over ? "text-warning" : ""}`}
      >
        {format(elapsed)}
      </span>
      <span className="text-sm text-muted">/ {format(expectedSeconds)}</span>
    </div>
  );
}
