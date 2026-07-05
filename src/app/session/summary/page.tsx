"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Card,
  EmptyState,
  PageHeader,
  ScoreBadge,
  StatTile,
  buttonPrimary,
  buttonSecondary,
} from "@/components/ui";
import type { InterviewSession, Topic } from "@/core/models";
import { ROLE_LABELS } from "@/core/models";
import { getCard } from "@/core/content/bank";
import { getSession, getTopicsById } from "@/core/storage/repositories";

function SessionSummary() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [topicsById, setTopicsById] = useState<Map<string, Topic>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([getSession(sessionId), getTopicsById()]).then(
      ([s, topics]) => {
        setSession(s ?? null);
        setTopicsById(topics);
        setLoaded(true);
      },
    );
  }, [sessionId]);

  if (sessionId && !loaded) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-secondary">
        Loading summary…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          title="Session not found"
          action={
            <Link href="/" className={buttonSecondary}>
              Back to dashboard
            </Link>
          }
        />
      </div>
    );
  }

  const reviewed = session.questions.filter((q) => q.review);
  const durationMinutes = session.endedAt
    ? Math.max(
        1,
        Math.round(
          (Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 60000,
        ),
      )
    : session.targetDurationMinutes;

  const strongQuestions = reviewed.filter((q) => (q.review?.totalScore ?? 0) >= 70);
  const practiceItems = reviewed.flatMap(
    (q) => q.review?.generatedPracticeItems ?? [],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Session summary"
        subtitle={`${ROLE_LABELS[session.role]} · ${durationMinutes} minute${durationMinutes === 1 ? "" : "s"}`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Overall score"
          value={`${session.overallScore?.totalScore ?? 0}%`}
        />
        <StatTile
          label="Questions answered"
          value={`${reviewed.length}/${session.questions.length}`}
        />
        <StatTile label="Strong answers" value={strongQuestions.length} hint="scored 70% or higher" />
      </div>

      {session.weakTopicIds.length > 0 && (
        <Card className="mb-4">
          <h2 className="font-bold">Weak topics to revisit</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {session.weakTopicIds.map((id) => (
              <li
                key={id}
                className="rounded-full border border-hairline bg-background px-3 py-1 text-sm"
              >
                {topicsById.get(id)?.name ?? id}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mb-4">
        <h2 className="font-bold">Question results</h2>
        <ul className="mt-2 divide-y divide-hairline">
          {session.questions.map((q) => {
            const card = getCard(q.questionCardId);
            return (
              <li key={q.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {card?.title ?? q.questionCardId}
                  </p>
                  <p className="text-xs text-muted">
                    {q.status === "skipped"
                      ? "Skipped"
                      : q.review
                        ? `${q.review.coveredRubricItemIds.length} covered · ${q.review.weakRubricItemIds.length} weak · ${q.review.missingRubricItemIds.length} missing`
                        : "Not answered"}
                  </p>
                </div>
                {q.review && <ScoreBadge score={q.review.totalScore} />}
              </li>
            );
          })}
        </ul>
      </Card>

      {practiceItems.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-bold">Recommended next practice</h2>
          <ol className="mt-2 list-decimal pl-5 text-sm text-secondary">
            {practiceItems.slice(0, 5).map((p) => (
              <li key={p.id} className="py-0.5">
                {p.prompt}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted">
            These cards are scheduled in your practice queue.
          </p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/setup" className={buttonPrimary}>
          Start another session
        </Link>
        <Link href="/practice" className={buttonSecondary}>
          Go to practice queue
        </Link>
        <Link href="/" className={buttonSecondary}>
          Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function SessionSummaryPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-secondary">
          Loading summary…
        </div>
      }
    >
      <SessionSummary />
    </Suspense>
  );
}
