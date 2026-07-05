"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnswerCapture } from "@/components/AnswerCapture";
import { RubricChecklist } from "@/components/RubricChecklist";
import {
  Card,
  EmptyState,
  PageHeader,
  buttonPrimary,
  buttonSecondary,
} from "@/components/ui";
import type { PracticeItem, UserSettings } from "@/core/models";
import { matchRubric, type RubricMatchResult } from "@/core/services/rubricMatcher";
import { applyPracticeReview } from "@/core/services/spacedRepetition";
import {
  getSettings,
  listDuePracticeItems,
  savePracticeItem,
} from "@/core/storage/repositories";

const SCORE_LABELS = [
  "Blank",
  "Barely",
  "Struggled",
  "OK",
  "Good",
  "Nailed it",
];

export default function PracticePage() {
  const [due, setDue] = useState<PracticeItem[] | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [match, setMatch] = useState<RubricMatchResult | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const reload = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const [items, s] = await Promise.all([
      listDuePracticeItems(nowIso),
      getSettings(),
    ]);
    setDue(items);
    setSettings(s);
    setTranscript(null);
    setMatch(null);
  }, []);

  useEffect(() => {
    // Deferring past the effect body keeps state updates off the render pass.
    const id = setTimeout(reload, 0);
    return () => clearTimeout(id);
  }, [reload]);

  if (!due || !settings) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-secondary">
        Loading…
      </div>
    );
  }

  const current = due[0];

  async function submitAnswer(text: string) {
    if (!current) return;
    setTranscript(text);
    if (current.expectedPoints.length > 0) {
      setMatch(matchRubric(text, current.expectedPoints));
    }
  }

  async function selfScore(score: 0 | 1 | 2 | 3 | 4 | 5) {
    if (!current) return;
    const updated = applyPracticeReview(current, {
      reviewedAt: new Date().toISOString(),
      score,
      transcript: transcript ?? undefined,
    });
    await savePracticeItem(updated);
    setSavedCount((c) => c + 1);
    await reload();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Practice queue"
        subtitle={
          due.length > 0
            ? `${due.length} card${due.length === 1 ? "" : "s"} due · answer, then rate yourself`
            : undefined
        }
      />

      {due.length === 0 ? (
        <EmptyState
          title={savedCount > 0 ? "All done for today 🎉" : "Nothing due"}
          description={
            savedCount > 0
              ? `You reviewed ${savedCount} card${savedCount === 1 ? "" : "s"}. Weak points from your sessions will show up here on their review date.`
              : "Practice cards are generated when you miss critical points in a session, or when you add a new topic."
          }
          action={
            <Link href="/setup" className={buttonPrimary}>
              Start a session
            </Link>
          }
        />
      ) : (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {current.type.replace(/_/g, " ")}
          </p>
          <p className="mt-2 text-base font-medium leading-relaxed">
            {current.prompt}
          </p>

          <div className="mt-4">
            {transcript === null ? (
              <AnswerCapture
                expectedDurationSeconds={90}
                speechModel={settings.preferredSpeechModel}
                speechEngine={settings.speechEngine}
                submitLabel="Check my answer"
                onSubmit={submitAnswer}
              />
            ) : (
              <>
                {match && current.expectedPoints.length > 0 && (
                  <RubricChecklist
                    items={current.expectedPoints}
                    coveredIds={match.coveredRubricItemIds}
                    weakIds={match.weakRubricItemIds}
                  />
                )}
                <p className="mt-3 rounded-lg bg-background px-3 py-2 text-sm text-secondary">
                  {transcript}
                </p>
                <fieldset className="mt-4">
                  <legend className="mb-2 text-sm font-medium text-secondary">
                    How well did you recall this?
                  </legend>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {([0, 1, 2, 3, 4, 5] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => selfScore(s)}
                        className={`${buttonSecondary} flex flex-col items-center px-2 py-2`}
                      >
                        <span className="text-base font-bold">{s}</span>
                        <span className="text-[10px] text-muted">
                          {SCORE_LABELS[s]}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Higher scores push the next review further away.
                  </p>
                </fieldset>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
