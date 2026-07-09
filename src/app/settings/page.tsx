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
  SpeechEngine,
  SpeechModelSize,
  UserSettings,
} from "@/core/models";
import { ROLE_LABELS, ROLE_TRACKS } from "@/core/models";
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
            {ROLE_TRACKS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelBase} htmlFor="speech-engine">
            Speech-to-text engine
          </label>
          <select
            id="speech-engine"
            className={inputBase}
            value={settings.speechEngine}
            onChange={(e) =>
              update({ speechEngine: e.target.value as SpeechEngine })
            }
          >
            <option value="whisper">
              Local Whisper — private &amp; offline
            </option>
            <option value="web_speech">
              Browser (Google) — fast &amp; live, online
            </option>
            <option value="cloud">
              Cloud Whisper large — most accurate, needs API key
            </option>
          </select>
          <p className="mt-1 text-xs text-muted">
            {settings.speechEngine === "web_speech"
              ? "Your voice is sent to the browser's speech service (Google). Fast and live, but weaker on technical vocabulary (webhook, idempotency…); falls back to local Whisper if unavailable."
              : settings.speechEngine === "cloud"
                ? "Whisper large-v3 accuracy with a per-question vocabulary hint — it is told the current question's expected terms. Audio goes to the provider you choose; falls back to local Whisper on errors."
                : "Audio never leaves your browser, and it recognizes technical terms noticeably better than the browser engine."}
          </p>
        </div>

        {settings.speechEngine === "cloud" && (
          <div className="flex flex-col gap-4 rounded-lg border border-hairline bg-background p-4">
            <div>
              <label className={labelBase} htmlFor="cloud-provider">
                Provider
              </label>
              <select
                id="cloud-provider"
                className={inputBase}
                value={settings.cloudProvider}
                onChange={(e) =>
                  update({
                    cloudProvider: e.target.value as UserSettings["cloudProvider"],
                  })
                }
              >
                <option value="groq">
                  Groq — whisper-large-v3-turbo (free tier, very fast)
                </option>
                <option value="openai">OpenAI — whisper-1</option>
              </select>
            </div>
            <div>
              <label className={labelBase} htmlFor="cloud-key">
                API key
              </label>
              <input
                id="cloud-key"
                type="password"
                autoComplete="off"
                className={inputBase}
                value={settings.cloudApiKey}
                onChange={(e) => update({ cloudApiKey: e.target.value })}
                placeholder={
                  settings.cloudProvider === "groq" ? "gsk_…" : "sk-…"
                }
              />
              <p className="mt-1 text-xs text-muted">
                Stored only in this browser and sent only to the provider.
                {settings.cloudProvider === "groq" &&
                  " Free key: console.groq.com → API Keys."}
              </p>
            </div>
          </div>
        )}

        {settings.speechEngine === "whisper" && (
        <div>
          <label className={labelBase} htmlFor="speech-model">
            Local Whisper model
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
          <p className="mt-1 text-xs text-muted">
            If transcriptions look wrong or keep coming back empty, switch to
            Base or Small — they are noticeably more accurate than Tiny.
            Phones always use Tiny to avoid running out of memory.
          </p>
        </div>
        )}

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
