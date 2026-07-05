"use client";

import { useEffect, useState } from "react";
import {
  Card,
  PageHeader,
  buttonPrimary,
  inputBase,
  labelBase,
} from "@/components/ui";
import type {
  InterviewRole,
  SpeechModelSize,
  UserSettings,
} from "@/core/models";
import { INTERVIEW_ROLES, ROLE_LABELS } from "@/core/models";
import { getSettings, saveSettings } from "@/core/storage/repositories";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  if (!settings) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-secondary">
        Loading…
      </div>
    );
  }

  function update(patch: Partial<UserSettings>) {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    setSaved(false);
  }

  async function save() {
    if (!settings) return;
    await saveSettings(settings);
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Settings"
        subtitle="Everything is stored locally in your browser — no account, no cloud."
      />

      <Card className="flex flex-col gap-5">
        <div>
          <label className={labelBase} htmlFor="target-role">
            Target role
          </label>
          <select
            id="target-role"
            className={inputBase}
            value={settings.targetRole}
            onChange={(e) =>
              update({ targetRole: e.target.value as InterviewRole })
            }
          >
            {INTERVIEW_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelBase} htmlFor="default-duration">
            Default duration
          </label>
          <select
            id="default-duration"
            className={inputBase}
            value={settings.defaultSessionDurationMinutes}
            onChange={(e) =>
              update({ defaultSessionDurationMinutes: Number(e.target.value) })
            }
          >
            {[15, 30, 45, 60].map((d) => (
              <option key={d} value={d}>
                {d} minutes
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelBase} htmlFor="speech-model">
            Speech-to-text model
          </label>
          <select
            id="speech-model"
            className={inputBase}
            value={settings.preferredSpeechModel}
            onChange={(e) =>
              update({ preferredSpeechModel: e.target.value as SpeechModelSize })
            }
          >
            <option value="tiny">Tiny — fastest (~40 MB)</option>
            <option value="base">Base — balanced (~80 MB)</option>
            <option value="small">Small — most accurate (~250 MB)</option>
          </select>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={settings.localOnlyMode}
              onChange={(e) => update({ localOnlyMode: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span>
              Local-only mode
              <span className="block text-xs text-muted">
                Audio and transcripts never leave the browser.
              </span>
            </span>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={settings.showHintsDuringInterview}
              onChange={(e) =>
                update({ showHintsDuringInterview: e.target.checked })
              }
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Show answer-structure hints during the interview
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={settings.autoGenerateFollowUps}
              onChange={(e) =>
                update({ autoGenerateFollowUps: e.target.checked })
              }
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Ask follow-up questions after answers
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={save} className={buttonPrimary}>
            Save settings
          </button>
          {saved && (
            <span className="text-sm font-medium text-good-text">Saved ✓</span>
          )}
        </div>
      </Card>
    </div>
  );
}
