"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  PageHeader,
  buttonPrimary,
  inputBase,
  labelBase,
} from "@/components/ui";
import type { InterviewRole, PracticeType } from "@/core/models";
import {
  PRACTICE_TYPES,
  PRACTICE_TYPE_DESCRIPTIONS,
  PRACTICE_TYPE_LABELS,
  ROLE_LABELS,
  ROLE_TRACKS,
  modesForPracticeTypes,
} from "@/core/models";
import { allQuestions } from "@/core/content/bank";
import { generateSession } from "@/core/services/sessionGenerator";
import {
  getSettings,
  getTopicsById,
  listDuePracticeItems,
  listRecentSessions,
  saveSession,
  saveSettings,
} from "@/core/storage/repositories";

export default function SessionSetupPage() {
  const router = useRouter();
  const [role, setRole] = useState<InterviewRole>("backend_developer");
  const [duration, setDuration] = useState<10 | 30>(30);
  const [practiceTypes, setPracticeTypes] = useState<PracticeType[]>([
    ...PRACTICE_TYPES,
  ]);
  const [includeWeakTopics, setIncludeWeakTopics] = useState(true);
  const [includeUnknownTopics, setIncludeUnknownTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setRole(s.targetRole);
      setDuration(s.defaultSessionDurationMinutes === 10 ? 10 : 30);
    });
  }, []);

  function togglePracticeType(type: PracticeType) {
    setPracticeTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  async function startPractice() {
    if (practiceTypes.length === 0) {
      setError("Select at least one practice type.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      const [topicsById, dueItems, recentSessions, settings] =
        await Promise.all([
          getTopicsById(),
          listDuePracticeItems(nowIso),
          listRecentSessions(3),
          getSettings(),
        ]);

      const session = generateSession(
        {
          role,
          durationMinutes: duration,
          modes: modesForPracticeTypes(practiceTypes),
          includeWeakTopics,
          includeUnknownTopics,
        },
        {
          cards: allQuestions,
          topicsById,
          dueTopicIds: new Set(dueItems.flatMap((i) => i.topicIds)),
          weakTopicIds: new Set(recentSessions.flatMap((s) => s.weakTopicIds)),
          recentQuestionCardIds: new Set(
            recentSessions.flatMap((s) =>
              s.questions.map((q) => q.questionCardId),
            ),
          ),
        },
        nowIso,
      );

      if (session.questions.length === 0) {
        setError(
          "No questions match this setup yet. Try another role or more practice types.",
        );
        setStarting(false);
        return;
      }

      await saveSession(session);
      await saveSettings({
        ...settings,
        targetRole: role,
        defaultSessionDurationMinutes: duration,
      });
      router.push(`/session?id=${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Practice setup"
        subtitle="Pick your role, pick a length, start talking."
      />

      <Card className="flex flex-col gap-6">
        <div>
          <label className={labelBase} htmlFor="role">
            Target role
          </label>
          <select
            id="role"
            className={inputBase}
            value={role}
            onChange={(e) => setRole(e.target.value as InterviewRole)}
          >
            {ROLE_TRACKS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className={labelBase}>Practice length</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: 10, title: "Quick", detail: "10 minutes · ~3 questions" },
                { value: 30, title: "Standard", detail: "30 minutes · ~5 questions" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDuration(opt.value)}
                aria-pressed={duration === opt.value}
                className={`rounded-xl border px-4 py-3 text-left ${
                  duration === opt.value
                    ? "border-accent bg-accent-soft/40 outline-2 outline-accent"
                    : "border-hairline hover:bg-background"
                }`}
              >
                <span className="block text-sm font-bold">{opt.title}</span>
                <span className="block text-xs text-secondary">{opt.detail}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm font-medium text-critical">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={startPractice}
          disabled={starting}
          className={`${buttonPrimary} py-3 text-base`}
        >
          {starting ? "Preparing questions…" : "Start Practice"}
        </button>

        <details className="group">
          <summary className="cursor-pointer select-none text-sm font-medium text-secondary hover:text-foreground">
            Advanced settings
          </summary>
          <div className="mt-4 flex flex-col gap-5 border-t border-hairline pt-4">
            <fieldset>
              <legend className={labelBase}>Practice types</legend>
              <div className="flex flex-col gap-2">
                {PRACTICE_TYPES.map((type) => (
                  <label key={type} className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={practiceTypes.includes(type)}
                      onChange={() => togglePracticeType(type)}
                      className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                    />
                    <span>
                      <span className="font-medium">
                        {PRACTICE_TYPE_LABELS[type]}
                      </span>
                      <span className="block text-xs text-muted">
                        {PRACTICE_TYPE_DESCRIPTIONS[type]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={includeWeakTopics}
                  onChange={(e) => setIncludeWeakTopics(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Prioritize my weak topics
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={includeUnknownTopics}
                  onChange={(e) => setIncludeUnknownTopics(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Include topics I marked as unknown (learning mode)
              </label>
            </div>

            <p className="text-xs text-muted">
              Speech-to-text model can be changed in Settings — the fast local
              model is used by default.
            </p>
          </div>
        </details>
      </Card>
    </div>
  );
}
