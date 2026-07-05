"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  EmptyState,
  PageHeader,
  ProgressMeter,
  ScoreBadge,
  StatTile,
  buttonPrimary,
} from "@/components/ui";
import type { InterviewSession, Topic, UserSettings } from "@/core/models";
import { ROLE_LABELS } from "@/core/models";
import { syncSeedTopics } from "@/core/storage/db";
import {
  getSettings,
  getTopicsById,
  listDuePracticeItems,
  listRecentSessions,
} from "@/core/storage/repositories";

type DashboardData = {
  settings: UserSettings;
  sessions: InterviewSession[];
  dueCount: number;
  topicsById: Map<string, Topic>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    (async () => {
      await syncSeedTopics();
      const nowIso = new Date().toISOString();
      const [settings, sessions, dueItems, topicsById] = await Promise.all([
        getSettings(),
        listRecentSessions(10),
        listDuePracticeItems(nowIso),
        getTopicsById(),
      ]);
      setData({ settings, sessions, dueCount: dueItems.length, topicsById });
    })();
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-secondary">
        Loading…
      </div>
    );
  }

  const { settings, sessions, dueCount, topicsById } = data;
  const targetRole = settings.targetRole;
  const roleSessions = sessions.filter(
    (s) => s.role === targetRole && s.overallScore,
  );
  const readiness =
    roleSessions.length > 0
      ? Math.round(
          roleSessions
            .slice(0, 5)
            .reduce((acc, s) => acc + (s.overallScore?.totalScore ?? 0), 0) /
            Math.min(roleSessions.length, 5),
        )
      : null;
  const lastScore = sessions.find((s) => s.overallScore)?.overallScore
    ?.totalScore;

  const weakTopicIds = [
    ...new Set(sessions.slice(0, 5).flatMap((s) => s.weakTopicIds)),
  ].slice(0, 8);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Dashboard"
        subtitle={`Target role: ${ROLE_LABELS[targetRole]}`}
        action={
          <Link href="/setup" className={buttonPrimary}>
            Start session
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Due practice"
          value={dueCount}
          hint={dueCount > 0 ? "cards waiting for review" : "all caught up"}
        />
        <StatTile
          label="Last session"
          value={lastScore !== undefined ? `${lastScore}%` : "–"}
          hint={lastScore !== undefined ? "overall score" : "no sessions yet"}
        />
        <StatTile
          label="Sessions"
          value={sessions.length}
          hint="completed so far"
        />
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">{ROLE_LABELS[targetRole]} readiness</h2>
          <span className="text-2xl font-bold tabular-nums">
            {readiness !== null ? `${readiness}%` : "–"}
          </span>
        </div>
        <div className="mt-3">
          <ProgressMeter
            value={readiness ?? 0}
            label={`${ROLE_LABELS[targetRole]} readiness`}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Average of your last {Math.min(roleSessions.length, 5) || "few"}{" "}
          {ROLE_LABELS[targetRole]} session scores.
          {readiness === null && " Complete a session to see your readiness."}
        </p>
      </Card>

      {weakTopicIds.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Weak topics</h2>
            <Link
              href="/practice"
              className="text-sm font-medium text-accent hover:underline"
            >
              Practice now
            </Link>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {weakTopicIds.map((id) => (
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

      <h2 className="mb-3 font-bold">Recent sessions</h2>
      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          description="Start your first mock interview — pick a role, answer out loud, and get rubric-based feedback."
          action={
            <Link href="/setup" className={buttonPrimary}>
              Start your first session
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-hairline">
            {sessions.slice(0, 6).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/session/summary?id=${s.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:opacity-80"
                >
                  <div>
                    <p className="text-sm font-medium">{ROLE_LABELS[s.role]}</p>
                    <p className="text-xs text-muted">
                      {new Date(s.startedAt).toLocaleString()} ·{" "}
                      {s.questions.length} questions
                      {!s.endedAt && " · in progress"}
                    </p>
                  </div>
                  {s.overallScore && <ScoreBadge score={s.overallScore.totalScore} />}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
