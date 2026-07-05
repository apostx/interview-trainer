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
import type {
  InterviewMode,
  InterviewRole,
  SpeechModelSize,
} from "@/core/models";
import {
  INTERVIEW_MODES,
  INTERVIEW_ROLES,
  MODE_LABELS,
  ROLE_LABELS,
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

const DEFAULT_MODES: InterviewMode[] = [
  "concept_check",
  "scenario_discussion",
  "tradeoff_decision",
  "troubleshooting",
  "system_design",
];

export default function SessionSetupPage() {
  const router = useRouter();
  const [role, setRole] = useState<InterviewRole>("backend_developer");
  const [duration, setDuration] = useState(30);
  const [modes, setModes] = useState<InterviewMode[]>(DEFAULT_MODES);
  const [includeWeakTopics, setIncludeWeakTopics] = useState(true);
  const [includeUnknownTopics, setIncludeUnknownTopics] = useState(false);
  const [speechModel, setSpeechModel] = useState<SpeechModelSize>("tiny");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setRole(s.targetRole);
      setDuration(s.defaultSessionDurationMinutes);
      setSpeechModel(s.preferredSpeechModel);
    });
  }, []);

  function toggleMode(mode: InterviewMode) {
    setModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  }

  async function startSession() {
    if (modes.length === 0) {
      setError("Select at least one interview mode.");
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
          modes,
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
          "No questions match this setup yet. Try another role or more modes.",
        );
        setStarting(false);
        return;
      }

      await saveSession(session);
      // Remember the chosen model + role as new defaults.
      await saveSettings({
        ...settings,
        targetRole: role,
        defaultSessionDurationMinutes: duration,
        preferredSpeechModel: speechModel,
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
        title="Session setup"
        subtitle="Configure your mock interview. Questions are picked from due practice, weak topics and role-critical areas."
      />

      <Card className="flex flex-col gap-5">
        <div>
          <label className={labelBase} htmlFor="role">
            Role
          </label>
          <select
            id="role"
            className={inputBase}
            value={role}
            onChange={(e) => setRole(e.target.value as InterviewRole)}
          >
            {INTERVIEW_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelBase} htmlFor="duration">
            Duration
          </label>
          <select
            id="duration"
            className={inputBase}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {[15, 30, 45, 60].map((d) => (
              <option key={d} value={d}>
                {d} minutes
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className={labelBase}>Interview modes</legend>
          <div className="flex flex-wrap gap-2">
            {INTERVIEW_MODES.map((mode) => {
              const active = modes.includes(mode);
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleMode(mode)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    active
                      ? "bg-accent text-white"
                      : "border border-hairline text-secondary hover:text-foreground"
                  }`}
                >
                  {MODE_LABELS[mode]}
                </button>
              );
            })}
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

        <div>
          <label className={labelBase} htmlFor="speech-model">
            Speech-to-text model
          </label>
          <select
            id="speech-model"
            className={inputBase}
            value={speechModel}
            onChange={(e) => setSpeechModel(e.target.value as SpeechModelSize)}
          >
            <option value="tiny">Tiny — fastest, downloads ~40 MB</option>
            <option value="base">Base — balanced, ~80 MB</option>
            <option value="small">Small — most accurate, ~250 MB</option>
          </select>
          <p className="mt-1 text-xs text-muted">
            Runs locally in your browser; downloaded once and cached.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-critical">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={startSession}
          disabled={starting}
          className={buttonPrimary}
        >
          {starting ? "Generating session…" : "Start interview session"}
        </button>
      </Card>
    </div>
  );
}
