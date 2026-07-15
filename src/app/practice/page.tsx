"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnswerCapture } from "@/components/AnswerCapture";
import { RubricChecklist } from "@/components/RubricChecklist";
import {
  Card,
  EmptyState,
  PageHeader,
  buttonPrimary,
  buttonSecondary,
  selectCompact,
} from "@/components/ui";
import {
  CheckboxDropdown,
  IMPORTANCE_LEVELS,
  importanceSummary,
  packGroups,
  packSummary,
} from "@/components/filters";
import { bankFor } from "@/core/content/bank";
import { topicIdsMatch, topicMetaMaps } from "@/core/content/topicFilters";
import {
  loadFilterPrefs,
  parseImpParam,
  parsePackParam,
  patchUrl,
  saveFilterPrefs,
  type RoleFilter,
} from "@/core/services/filterPrefs";
import type { PracticeItem, UserSettings } from "@/core/models";
import { ROLE_LABELS, ROLE_TRACKS } from "@/core/models";
import { matchRubric, matchRubricItem, type RubricMatchResult } from "@/core/services/rubricMatcher";
import {
  combineStatuses,
  hasNegativeSignal,
  semanticSimilarities,
  statusFromSimilarity,
} from "@/core/services/semanticMatcher";
import { useEmbeddingStore } from "@/stores/embeddingStore";
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

  // The same filters as Study, shared through the persisted prefs and
  // mirrored in the URL — practice what you scoped your studying to.
  const [roleFilter, setRoleState] = useState<RoleFilter>("all");
  const [selectedPacks, setPacksState] = useState<string[]>([]);
  const [selectedImp, setImpState] = useState<string[]>([]);

  // Practice items only carry topic ids; role/importance resolve through the
  // selected packs' topics (empty selection = every pack).
  const activeBank = useMemo(() => bankFor(selectedPacks), [selectedPacks]);
  const meta = useMemo(() => topicMetaMaps(activeBank), [activeBank]);

  useEffect(() => {
    const syncUrl = () => {
      const p = new URLSearchParams(window.location.search);
      setRoleState((p.get("role") as RoleFilter | null) ?? "all");
      setPacksState(parsePackParam(p.get("pack")));
      setImpState(parseImpParam(p.get("imp")));
    };
    const init = () => {
      const p = new URLSearchParams(window.location.search);
      const prefs = loadFilterPrefs();
      const patch: Record<string, string | null> = {};
      if (!p.has("role") && prefs.role && prefs.role !== "all")
        patch.role = prefs.role;
      if (!p.has("pack") && prefs.packs?.length)
        patch.pack = prefs.packs.join(",");
      if (!p.has("imp") && prefs.imp?.length) patch.imp = prefs.imp.join(",");
      if (Object.keys(patch).length > 0) patchUrl(patch);
      syncUrl();
    };
    init();
    window.addEventListener("popstate", syncUrl);
    return () => window.removeEventListener("popstate", syncUrl);
  }, []);

  const setRoleFilter = (role: RoleFilter) => {
    setRoleState(role);
    patchUrl({ role: role === "all" ? null : role });
    saveFilterPrefs({ role });
  };
  const setSelectedPacks = (packs: string[]) => {
    setPacksState(packs);
    patchUrl({ pack: packs.length > 0 ? packs.join(",") : null });
    saveFilterPrefs({ packs });
  };
  const setSelectedImp = (levels: string[]) => {
    setImpState(levels);
    patchUrl({ imp: levels.length > 0 ? levels.join(",") : null });
    saveFilterPrefs({ imp: levels });
  };
  const clearFilters = () => {
    setRoleState("all");
    setPacksState([]);
    setImpState([]);
    patchUrl({ role: null, pack: null, imp: null });
    saveFilterPrefs({ role: "all", packs: [], imp: [] });
  };

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

  const queue = due.filter((item) =>
    topicIdsMatch(item.topicIds, meta, roleFilter, selectedImp),
  );
  const current = queue[0];
  const filteredOut = due.length - queue.length;
  const filtersActive =
    roleFilter !== "all" || selectedPacks.length > 0 || selectedImp.length > 0;

  async function submitAnswer(text: string) {
    if (!current) return;
    setTranscript(text);
    if (current.expectedPoints.length === 0) return;
    try {
      const embed = useEmbeddingStore.getState().embed;
      const sims = await semanticSimilarities(text, current.expectedPoints, embed);
      const result: RubricMatchResult = {
        coveredRubricItemIds: [],
        weakRubricItemIds: [],
        missingRubricItemIds: [],
      };
      for (const item of current.expectedPoints) {
        const status = combineStatuses(
          matchRubricItem(text, item),
          statusFromSimilarity(sims.get(item.id) ?? 0),
          hasNegativeSignal(text, item),
        );
        if (status === "covered") result.coveredRubricItemIds.push(item.id);
        else if (status === "weak") result.weakRubricItemIds.push(item.id);
        else result.missingRubricItemIds.push(item.id);
      }
      setMatch(result);
    } catch {
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
          queue.length > 0
            ? `${queue.length} card${queue.length === 1 ? "" : "s"} due · answer, then rate yourself`
            : undefined
        }
      />

      {due.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-secondary">Role</span>
            <select
              className={selectCompact}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              aria-label="Role filter"
            >
              <option value="all">All roles</option>
              {ROLE_TRACKS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-secondary">Pack</span>
            <CheckboxDropdown
              ariaLabel="Pack filter"
              allLabel="All packs"
              summary={packSummary(selectedPacks)}
              groups={packGroups()}
              selected={selectedPacks}
              onChange={setSelectedPacks}
            />
          </div>

          {meta.hasImportance && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-secondary">
                Importance
              </span>
              <CheckboxDropdown
                ariaLabel="Importance filter"
                allLabel="All topics"
                summary={importanceSummary(selectedImp)}
                groups={[["", IMPORTANCE_LEVELS]]}
                selected={selectedImp}
                onChange={setSelectedImp}
              />
            </div>
          )}

          {filteredOut > 0 && (
            <span className="text-xs text-muted">
              {filteredOut} card{filteredOut === 1 ? "" : "s"} hidden by the
              filters
            </span>
          )}
        </div>
      )}

      {queue.length === 0 ? (
        <EmptyState
          title={
            due.length > 0
              ? "Nothing due with these filters"
              : savedCount > 0
                ? "All done for today 🎉"
                : "Nothing due"
          }
          description={
            due.length > 0
              ? `${due.length} due card${due.length === 1 ? "" : "s"} fall outside the current filters.`
              : savedCount > 0
                ? `You reviewed ${savedCount} card${savedCount === 1 ? "" : "s"}. Weak points from your sessions will show up here on their review date.`
                : "Practice cards are generated when you miss critical points in a session."
          }
          action={
            due.length > 0 && filtersActive ? (
              <button
                type="button"
                onClick={clearFilters}
                className={buttonPrimary}
              >
                Show all due cards
              </button>
            ) : (
              <Link href="/setup" className={buttonPrimary}>
                Start a session
              </Link>
            )
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
                cloudProvider={settings.cloudProvider}
                cloudApiKey={settings.cloudApiKey}
                vocabularyHint={current.expectedPoints.flatMap(
                  (p) => p.acceptedSignals,
                )}
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
