"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, ModeBadge, PageHeader } from "@/components/ui";
import {
  CheckboxDropdown,
  IMPORTANCE_LEVELS,
  importanceSummary,
  LanguagePicker,
  packGroups,
  packSummary,
} from "@/components/filters";
import { bankFor } from "@/core/content/bank";
import { topicIdsMatch, topicMetaMaps } from "@/core/content/topicFilters";
import {
  availableLanguages,
  DEFAULT_LANG,
  localizeCard,
  localizeTopic,
} from "@/core/content/i18n";
import type { LangCode, QuestionCard, Topic } from "@/core/models";
import {
  downloadStudyPdf,
  type CardStyle,
} from "@/core/pdf/studyPdf";
import {
  loadFilterPrefs,
  parseImpParam,
  parsePackParam,
  patchUrl,
  saveFilterPrefs,
} from "@/core/services/filterPrefs";

/**
 * Question browser: every question of the selected data packs, grouped by
 * topic. The compact Q&A view shows just the question and its answer
 * material; the full view adds modes, structure hints and follow-ups. Each
 * question links to the Study page of the topics it is bound to.
 */

function TopicChips({
  topicIds,
  topicsById,
  lang,
}: {
  topicIds: string[];
  topicsById: Map<string, Topic>;
  lang: LangCode;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        Study
      </span>
      {topicIds.map((id) => {
        const topic = topicsById.get(id);
        return (
          <Link
            key={id}
            href={`/study/?topic=${id}`}
            className="rounded-full border border-hairline bg-background px-2.5 py-0.5 text-xs font-medium text-secondary hover:border-accent hover:text-accent"
          >
            {topic ? localizeTopic(topic, lang).name : id} →
          </Link>
        );
      })}
    </div>
  );
}

function QuestionEntry({
  card,
  full,
  topicsById,
  lang,
}: {
  card: QuestionCard;
  full: boolean;
  topicsById: Map<string, Topic>;
  lang: LangCode;
}) {
  return (
    <Card className="mb-3">
      {full && (
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {card.modes.slice(0, 2).map((m) => (
            <ModeBadge key={m} mode={m} />
          ))}
        </div>
      )}
      <p className="font-semibold leading-relaxed">{card.prompt}</p>
      {full && card.answerStructureHint && (
        <p className="mt-2 rounded-lg bg-background px-3 py-2 text-sm text-secondary">
          💡 <span className="font-medium text-foreground">Structure:</span>{" "}
          {card.answerStructureHint}
        </p>
      )}
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Answer
      </p>
      <ul className="mt-1 flex flex-col gap-1.5">
        {card.expectedPoints.map((p) => (
          <li key={p.id} className="text-sm leading-relaxed">
            <span className="font-medium">{p.label}</span>
            {full && p.importance === "critical" && (
              <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                critical
              </span>
            )}
            {p.description && (
              <span className="block text-secondary">{p.description}</span>
            )}
          </li>
        ))}
      </ul>
      {full && card.sampleStrongAnswer && (
        <p className="mt-3 rounded-lg bg-background px-3 py-2 text-sm leading-relaxed text-secondary">
          <span className="font-medium text-foreground">Sample strong answer:</span>{" "}
          {card.sampleStrongAnswer}
        </p>
      )}
      {full && card.followUps.length > 0 && (
        <>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Likely follow-ups
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-secondary">
            {card.followUps.map((f) => (
              <li key={f.id}>{f.prompt}</li>
            ))}
          </ul>
        </>
      )}
      <TopicChips topicIds={card.topicIds} topicsById={topicsById} lang={lang} />
    </Card>
  );
}

export default function QuestionsPage() {
  const [selectedPacks, setPacksState] = useState<string[]>([]);
  const [selectedImp, setImpState] = useState<string[]>([]);
  const [fullView, setFullViewState] = useState(false);
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);
  const [generating, setGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const activeBank = useMemo(() => bankFor(selectedPacks), [selectedPacks]);
  const meta = useMemo(() => topicMetaMaps(activeBank), [activeBank]);
  const { topicsById, languages } = useMemo(
    () => ({
      topicsById: new Map(activeBank.topics.map((t) => [t.id, t])),
      languages: availableLanguages(activeBank.topics, activeBank.questions),
    }),
    [activeBank],
  );

  // Same URL/prefs pattern as Study/Practice: URL wins, bare visits restore
  // the persisted selection, back/forward re-reads the URL.
  useEffect(() => {
    const syncUrl = () => {
      const p = new URLSearchParams(window.location.search);
      setPacksState(parsePackParam(p.get("pack")));
      setImpState(parseImpParam(p.get("imp")));
      setFullViewState(p.get("view") === "full");
      const l = p.get("lang");
      if (l) setLangState(l);
    };
    const init = () => {
      const p = new URLSearchParams(window.location.search);
      const prefs = loadFilterPrefs();
      const patch: Record<string, string | null> = {};
      if (!p.has("pack") && prefs.packs?.length)
        patch.pack = prefs.packs.join(",");
      if (!p.has("imp") && prefs.imp?.length) patch.imp = prefs.imp.join(",");
      if (!p.has("view") && prefs.qview === "full") patch.view = "full";
      if (!p.has("lang") && prefs.lang && prefs.lang !== DEFAULT_LANG)
        patch.lang = prefs.lang;
      if (Object.keys(patch).length > 0) patchUrl(patch);
      syncUrl();
    };
    init();
    window.addEventListener("popstate", syncUrl);
    return () => window.removeEventListener("popstate", syncUrl);
  }, []);

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
  const setFullView = (full: boolean) => {
    setFullViewState(full);
    patchUrl({ view: full ? "full" : null });
    saveFilterPrefs({ qview: full ? "full" : "qa" });
  };
  const setLang = (l: LangCode) => {
    setLangState(l);
    patchUrl({ lang: l === DEFAULT_LANG ? null : l });
    saveFilterPrefs({ lang: l });
  };

  const activeLang = languages.includes(lang) ? lang : DEFAULT_LANG;

  // A question passes when ANY of its topics is at a selected importance
  // level (same rule as the Practice filter); empty selection = everything.
  const visibleQuestions = useMemo(
    () =>
      activeBank.questions.filter((c) =>
        topicIdsMatch(c.topicIds, meta, "all", selectedImp),
      ),
    [activeBank, meta, selectedImp],
  );

  // Group by primary topic (a question shows chips for ALL its topics).
  const groups = useMemo(() => {
    const byTopic = new Map<string, QuestionCard[]>();
    for (const card of visibleQuestions) {
      const primary = card.topicIds[0];
      byTopic.set(primary, [...(byTopic.get(primary) ?? []), card]);
    }
    return byTopic;
  }, [visibleQuestions]);

  const sortedGroups = [...groups.entries()]
    .map(([topicId, cards]) => {
      const topic = topicsById.get(topicId);
      return {
        topicId,
        topic,
        name: topic ? localizeTopic(topic, activeLang).name : topicId,
        cards,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Flashcard PDF: one question per phone-sized page, using exactly the
  // questions currently shown (pack + importance filters).
  async function generateCards() {
    setGenerating(true);
    setPdfError(null);
    try {
      const style = Number(
        new URLSearchParams(window.location.search).get("cards"),
      );
      const scopeName =
        selectedPacks.length === 1
          ? selectedPacks[0]
          : selectedPacks.length > 1
            ? `${selectedPacks.length} packs`
            : "All questions";
      await downloadStudyPdf("qcards", {
        cardIds: visibleQuestions.map((c) => c.id),
        name: scopeName,
        slug:
          selectedPacks.length === 1
            ? selectedPacks[0].replace(/[^a-zA-Z0-9_-]+/g, "-")
            : "questions",
        lang: activeLang,
        topics: activeBank.topics,
        questions: activeBank.questions,
        cardStyle: (style >= 1 && style <= 3 ? style : 1) as CardStyle,
      });
    } catch (e) {
      setPdfError(
        `PDF generation failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Questions"
        subtitle={
          visibleQuestions.length === activeBank.questions.length
            ? `${activeBank.questions.length} question${activeBank.questions.length === 1 ? "" : "s"} in the selected packs, grouped by topic.`
            : `${visibleQuestions.length} of ${activeBank.questions.length} questions (importance filter), grouped by topic.`
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-xs text-muted">
          {visibleQuestions.length} question card
          {visibleQuestions.length === 1 ? "" : "s"} in the flashcard PDF
        </span>
        <button
          type="button"
          disabled={generating || visibleQuestions.length === 0}
          onClick={generateCards}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
        >
          {generating ? "Generating…" : "PDF · flashcards"}
        </button>
      </div>

      {pdfError && (
        <p role="alert" className="mb-4 text-sm font-medium text-critical">
          {pdfError}
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2">
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

        <div className="flex flex-wrap gap-2" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => setFullView(false)}
            aria-pressed={!fullView}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              !fullView
                ? "bg-accent text-white"
                : "border border-hairline text-secondary hover:text-foreground"
            }`}
          >
            Q&amp;A
          </button>
          <button
            type="button"
            onClick={() => setFullView(true)}
            aria-pressed={fullView}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              fullView
                ? "bg-accent text-white"
                : "border border-hairline text-secondary hover:text-foreground"
            }`}
          >
            Full details
          </button>
        </div>

        <LanguagePicker
          lang={activeLang}
          languages={languages}
          onChange={setLang}
          className="ml-auto"
        />
      </div>

      {sortedGroups.length === 0 && (
        <p className="py-10 text-center text-sm text-secondary">
          {selectedImp.length > 0
            ? "No questions match the importance filter — clear it or pick another pack."
            : "The selected data packs have no questions — pick another pack."}
        </p>
      )}

      {sortedGroups.map(({ topicId, topic, name, cards }) => (
        <section key={topicId} className="mb-6">
          <h2 className="mb-2 flex items-baseline gap-2 font-bold">
            {topic ? (
              <Link
                href={`/study/?topic=${topicId}`}
                className="hover:text-accent hover:underline"
              >
                {name}
              </Link>
            ) : (
              name
            )}
            {topic?.importance !== undefined && (
              <span
                title={`Interview importance ${topic.importance}/5`}
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  topic.importance >= 4
                    ? "bg-accent/15 text-accent"
                    : "bg-background text-muted"
                }`}
              >
                ★{topic.importance}
              </span>
            )}
            <span className="text-xs font-medium text-muted">
              {cards.length} question{cards.length === 1 ? "" : "s"}
            </span>
          </h2>
          {cards.map((card) => (
            <QuestionEntry
              key={card.id}
              card={localizeCard(card, activeLang)}
              full={fullView}
              topicsById={topicsById}
              lang={activeLang}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
