"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  EmptyState,
  PageHeader,
  buttonPrimary,
  buttonSecondary,
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
        listRecentSessions(5),
        listDuePracticeItems(nowIso),
        getTopicsById(),
      ]);
      setData({ settings, sessions, dueCount: dueItems.length, topicsById });
    })();
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-secondary">
        Loading…
      </div>
    );
  }

  const { settings, sessions, dueCount, topicsById } = data;
  const weakTopicIds = [
    ...new Set(sessions.flatMap((s) => s.weakTopicIds)),
  ].slice(0, 3);

  const recommendation =
    dueCount > 0
      ? {
          text: `You have ${dueCount} practice card${dueCount === 1 ? "" : "s"} due — reviewing them is the fastest way to improve.`,
          cta: "Review now",
          href: "/practice",
        }
      : weakTopicIds.length > 0
        ? {
            text: `Run a practice session — your weak topics (${weakTopicIds
              .map((id) => topicsById.get(id)?.name ?? id)
              .join(", ")}) will be prioritized.`,
            cta: "Start Practice",
            href: "/setup",
          }
        : {
            text: "Start with a quick 10-minute practice to see where you stand.",
            cta: "Start Practice",
            href: "/setup",
          };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Dashboard"
        subtitle={`Target role: ${ROLE_LABELS[settings.targetRole]}`}
      />

      <Card className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Next recommended practice
        </p>
        <p className="mt-2 text-base leading-relaxed">{recommendation.text}</p>
        <Link
          href={recommendation.href}
          className={`${buttonPrimary} mt-4 inline-block`}
        >
          {recommendation.cta}
        </Link>
      </Card>

      {weakTopicIds.length > 0 ? (
        <Card className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Your weak topics
          </p>
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
      ) : (
        sessions.length === 0 && (
          <EmptyState
            title="No practice yet"
            description="Pick a role, answer a few questions out loud, get feedback — that's the whole loop."
          />
        )
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/setup" className={`${buttonPrimary} py-3 text-base`}>
          Start Practice
        </Link>
        <Link href="/practice" className={`${buttonSecondary} py-3 text-base`}>
          Review Weak Topics
        </Link>
      </div>
    </div>
  );
}
