"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, ModeBadge, PageHeader, buttonGhost, buttonSecondary, inputBase, selectCompact } from "@/components/ui";
import type { LangCode, QuestionCard, Topic } from "@/core/models";
import { ROLE_LABELS, ROLE_TRACKS, TRACK_MEMBER_ROLES } from "@/core/models";
import { allBanks, liveBank } from "@/core/content/bank";
import {
  CheckboxDropdown,
  DevVersionSwitcher,
  IMPORTANCE_LEVELS,
  importanceSummary,
} from "@/components/filters";
import { importanceToken } from "@/core/content/topicFilters";
import {
  loadFilterPrefs,
  parseImpParam,
  parseSourceParam,
  patchUrl,
  saveFilterPrefs,
  type RoleFilter,
} from "@/core/services/filterPrefs";
import {
  availableLanguages,
  DEFAULT_LANG,
  languageLabel,
  localizeCard,
  localizeTopic,
} from "@/core/content/i18n";
import {
  downloadStudyPdf,
  type CardStyle,
  type StudyPdfFormat,
  type StudyPdfScope,
} from "@/core/pdf/studyPdf";
import {
  isMistakesHeading,
  isTermsHeading,
  parseKeyTerm,
  parseStudyNotes,
} from "@/core/content/notes";
import { normalizedIncludes } from "@/core/services/transcriptNormalizer";

const CATEGORY_LABELS: Record<Topic["category"], string> = {
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Fullstack",
  architecture: "Architecture",
  cloud: "Cloud",
  security: "Security",
  database: "Database",
  devops: "DevOps",
  observability: "Observability",
  soft_technical: "Soft technical",
  core: "Core Engineering",
};

// Pre-prefs versions stored the reading language under this key.
const LEGACY_LANG_KEY = "study-lang";

/** Role and source filters apply per card; a topic shows if any card survives.
 * An empty `selectedSources` means "all sources". */
function cardMatchesFilters(
  card: QuestionCard,
  role: RoleFilter,
  selectedSources: string[],
  sources: Map<string, string[]>,
): boolean {
  if (role !== "all") {
    const members = TRACK_MEMBER_ROLES[role] ?? [role];
    if (!card.roles.some((r) => members.includes(r))) return false;
  }
  if (selectedSources.length > 0) {
    const cardSources = sources.get(card.id) ?? [];
    if (!selectedSources.some((s) => cardSources.includes(s))) return false;
  }
  return true;
}

function cardMatchesQuery(card: QuestionCard, query: string): boolean {
  return (
    normalizedIncludes(card.title, query) || normalizedIncludes(card.prompt, query)
  );
}

const CHIP_CLASSES = ["bg-chip-1", "bg-chip-2", "bg-chip-3", "bg-chip-4"];

// Annotates each block with whether it sits in the key-terms section (whose
// lists render as term cards instead of bullets).
function annotateBlocks(notes: string) {
  let inTerms = false;
  return parseStudyNotes(notes).map((block) => {
    if (block.type === "h") inTerms = isTermsHeading(block.text);
    return { block, inTerms };
  });
}

/**
 * The study material renders on a warm "paper" surface with highlighter-style
 * headings and flashcard-like key terms: reading research favours dark text
 * on a light background, and selective vivid colour aids attention/encoding.
 */
function StudyNotes({ notes }: { notes: string }) {
  const rendered = annotateBlocks(notes).map(({ block, inTerms }, i) => {
    if (block.type === "h") {
      const mark = isMistakesHeading(block.text) ? "bg-marker-warn" : "bg-marker";
      return (
        <h2 key={i} className="mt-3 text-base font-bold first:mt-0">
          <span className={`${mark} -mx-1 rounded-sm box-decoration-clone px-1.5 py-0.5`}>
            {block.text}
          </span>
        </h2>
      );
    }
    if (block.type === "p") {
      return (
        <p key={i} className="text-[15px] leading-relaxed text-paper-soft">
          {block.text}
        </p>
      );
    }
    if (inTerms) {
      return (
        <dl key={i} className="grid gap-2 sm:grid-cols-2">
          {block.items.map((item, j) => {
            const { term, def } = parseKeyTerm(item);
            return (
              <div
                key={j}
                className={`${CHIP_CLASSES[j % CHIP_CLASSES.length]} rounded-lg px-3 py-2 shadow-sm`}
              >
                <dt className="text-sm font-bold">{term}</dt>
                {def && <dd className="mt-0.5 text-sm leading-snug">{def}</dd>}
              </div>
            );
          })}
        </dl>
      );
    }
    return (
      <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 marker:text-paper-soft">
        {block.items.map((item, j) => (
          <li key={j} className="text-[15px] leading-relaxed text-paper-soft">
            {item}
          </li>
        ))}
      </ul>
    );
  });
  return (
    <div className="mb-6 rounded-2xl border border-paper-line bg-paper px-5 py-6 text-paper-ink shadow-sm sm:px-7">
      <div className="flex max-w-prose flex-col gap-4">{rendered}</div>
    </div>
  );
}

function StudyCard({ card }: { card: QuestionCard }) {
  return (
    <Card className="mb-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        {card.modes.slice(0, 2).map((m) => (
          <ModeBadge key={m} mode={m} />
        ))}
      </div>
      <p className="font-semibold">{card.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-secondary">{card.prompt}</p>
      {card.answerStructureHint && (
        <p className="mt-2 rounded-lg bg-background px-3 py-2 text-sm text-secondary">
          💡 <span className="font-medium text-foreground">Structure:</span>{" "}
          {card.answerStructureHint}
        </p>
      )}
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
        A strong answer covers
      </p>
      <ul className="mt-1 flex flex-col gap-1.5">
        {card.expectedPoints.map((p) => (
          <li key={p.id} className="text-sm leading-relaxed">
            <span className="font-medium">{p.label}</span>
            {p.importance === "critical" && (
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
      {card.followUps.length > 0 && (
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
    </Card>
  );
}

/** Study reading-language dropdown; renders nothing unless translations exist. */
function LanguagePicker({
  lang,
  languages,
  onChange,
  className,
}: {
  lang: LangCode;
  languages: LangCode[];
  onChange: (lang: LangCode) => void;
  className?: string;
}) {
  if (languages.length < 2) return null;
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <label className="text-sm font-medium text-secondary" htmlFor="lang-filter">
        Language
      </label>
      <select
        id="lang-filter"
        className={selectCompact}
        value={lang}
        onChange={(e) => onChange(e.target.value)}
      >
        {languages.map((code) => (
          <option key={code} value={code}>
            {languageLabel(code)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Summary text for the source dropdown ("All sources" / a name / "N sources"). */
function sourceSummary(
  selected: string[],
  sourceGroups: [string, { id: string; name: string }[]][],
): string {
  if (selected.length === 0) return "All sources";
  if (selected.length === 1)
    return (
      sourceGroups
        .flatMap(([, entries]) => entries)
        .find((s) => s.id === selected[0])?.name ?? "1 source"
    );
  return `${selected.length} sources`;
}

function PdfButtons({
  generating,
  onGenerate,
}: {
  generating: StudyPdfFormat | null;
  onGenerate: (format: StudyPdfFormat) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={generating !== null}
        onClick={() => onGenerate("phone")}
        className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-50"
      >
        {generating === "phone" ? "Generating…" : "PDF · phone"}
      </button>
      <button
        type="button"
        disabled={generating !== null}
        onClick={() => onGenerate("a4")}
        className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm font-semibold hover:bg-background disabled:opacity-50"
      >
        {generating === "a4" ? "Generating…" : "PDF · A4"}
      </button>
      <button
        type="button"
        disabled={generating !== null}
        onClick={() => onGenerate("cards")}
        className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm font-semibold hover:bg-background disabled:opacity-50"
      >
        {generating === "cards" ? "Generating…" : "PDF · cards"}
      </button>
    </div>
  );
}

// Reads the Study view state out of the current query string.
function readUrlState() {
  const p = new URLSearchParams(window.location.search);
  return {
    topicId: p.get("topic"),
    role: (p.get("role") as RoleFilter | null) ?? null,
    sources: parseSourceParam(p.get("source")),
    query: p.get("q") ?? "",
    lang: p.get("lang"),
    dev: p.get("dev") === "1",
    version: p.get("ver") ?? "Live",
    imp: parseImpParam(p.get("imp")),
  };
}

export default function StudyPage() {
  // The whole Study view state is mirrored in the URL, so a topic or a
  // filtered list can be linked, bookmarked, and survives a refresh or the
  // back/forward buttons. The native History API is used directly (rather
  // than the Next router) because on a static export the router mis-replays
  // query changes after a reload + back navigation.
  const [selectedTopicId, setTopicId] = useState<string | null>(null);
  const [roleParam, setRoleParam] = useState<RoleFilter | null>(null);
  const [selectedSources, setSourcesState] = useState<string[]>([]);
  const [query, setQueryState] = useState("");
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);
  const [devMode, setDevMode] = useState(false);
  const [versionLabel, setVersionLabelState] = useState("Live");
  const [selectedImp, setImpState] = useState<string[]>([]);
  const [generating, setGenerating] = useState<StudyPdfFormat | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // The active content bank (Live, or an alternate version picked in dev mode).
  const activeBank =
    allBanks.find((b) => b.label === versionLabel)?.bank ?? liveBank;

  // Everything the view lists is derived from the active bank, so switching
  // versions swaps the whole Study content at once.
  const { cardsByTopicId, studyTopics, sourceGroups, languages, hasImportance } = useMemo(() => {
    const cardsByTopicId = new Map<string, QuestionCard[]>();
    for (const card of activeBank.questions) {
      for (const topicId of card.topicIds) {
        cardsByTopicId.set(topicId, [
          ...(cardsByTopicId.get(topicId) ?? []),
          card,
        ]);
      }
    }
    const studyTopics = activeBank.topics.filter(
      (t) => cardsByTopicId.has(t.id) || t.studyNotes,
    );
    const groups = new Map<string, { id: string; name: string }[]>();
    for (const src of activeBank.contentSources) {
      groups.set(src.group, [
        ...(groups.get(src.group) ?? []),
        { id: src.id, name: src.name },
      ]);
    }
    const sourceGroups = [...groups.entries()].sort();
    const languages = availableLanguages(activeBank.topics, activeBank.questions);
    // The importance filter only appears when the content actually rates topics.
    const hasImportance = studyTopics.some((t) => t.importance !== undefined);
    return { cardsByTopicId, studyTopics, sourceGroups, languages, hasImportance };
  }, [activeBank]);

  // The reading language is both shareable (URL) and a preference (prefs).
  const setLang = (l: LangCode) => {
    setLangState(l);
    patchUrl({ lang: l === DEFAULT_LANG ? null : l });
    saveFilterPrefs({ lang: l });
  };

  // On mount, fill URL params missing from the address bar with the persisted
  // prefs (so filters survive navigating away and back), then read the URL;
  // re-read it whenever the user uses the browser back/forward buttons.
  useEffect(() => {
    const syncUrl = () => {
      const s = readUrlState();
      setTopicId(s.topicId);
      setRoleParam(s.role);
      setSourcesState(s.sources);
      setQueryState(s.query);
      if (s.lang) setLangState(s.lang);
      setDevMode(s.dev);
      setVersionLabelState(s.version);
      setImpState(s.imp);
    };
    const init = () => {
      const p = new URLSearchParams(window.location.search);
      const prefs = loadFilterPrefs();
      const patch: Record<string, string | null> = {};
      if (!p.has("role") && prefs.role) patch.role = prefs.role;
      if (!p.has("source") && prefs.sources?.length)
        patch.source = prefs.sources.join(",");
      if (!p.has("imp") && prefs.imp?.length) patch.imp = prefs.imp.join(",");
      if (!p.has("lang")) {
        const l = prefs.lang ?? localStorage.getItem(LEGACY_LANG_KEY);
        if (l && l !== DEFAULT_LANG) patch.lang = l;
      }
      if (!p.has("dev") && prefs.dev) patch.dev = "1";
      if (!p.has("ver") && prefs.ver && prefs.ver !== "Live")
        patch.ver = prefs.ver;
      if (Object.keys(patch).length > 0) patchUrl(patch);
      // A dev link someone sent me should stick like my own choice would.
      if (p.get("dev") === "1") saveFilterPrefs({ dev: true });
      if (p.has("ver")) saveFilterPrefs({ ver: p.get("ver") ?? "Live" });
      syncUrl();
    };
    init();
    window.addEventListener("popstate", syncUrl);
    return () => window.removeEventListener("popstate", syncUrl);
  }, []);

  const setVersion = (label: string) => {
    setVersionLabelState(label);
    patchUrl({ ver: label === "Live" ? null : label });
    saveFilterPrefs({ ver: label });
  };

  const exitDevMode = () => {
    setDevMode(false);
    setVersionLabelState("Live");
    patchUrl({ dev: null, ver: null });
    saveFilterPrefs({ dev: false, ver: "Live" });
  };

  const setSelectedImp = (levels: string[]) => {
    setImpState(levels);
    patchUrl({ imp: levels.length > 0 ? levels.join(",") : null });
    saveFilterPrefs({ imp: levels });
  };

  // Empty selection = all topics (rated or not); otherwise a topic must be at
  // one of the selected levels ("u" = unrated).
  const passesImportance = (topic: Topic) =>
    selectedImp.length === 0 ||
    selectedImp.includes(importanceToken(topic.importance));

  // No implicit default: the role filter is "all" unless the URL or the
  // saved prefs say otherwise. (It used to fall back to the last session's
  // role, which silently emptied banks tagged for other roles.)
  const selectedRole: RoleFilter = roleParam ?? "all";

  const setQuery = (q: string) => {
    setQueryState(q);
    patchUrl({ q: q || null });
  };
  const setSelectedRole = (role: RoleFilter) => {
    setRoleParam(role);
    patchUrl({ role });
    saveFilterPrefs({ role });
  };
  const setSelectedSources = (sources: string[]) => {
    setSourcesState(sources);
    patchUrl({ source: sources.length > 0 ? sources.join(",") : null });
    saveFilterPrefs({ sources });
  };
  const setSelectedTopicId = (id: string | null) => {
    setTopicId(id);
    patchUrl({ topic: id }, true);
  };
  const clearFilters = () => {
    setRoleParam("all");
    setSourcesState([]);
    setImpState([]);
    patchUrl({ role: "all", source: null, imp: null });
    saveFilterPrefs({ role: "all", sources: [], imp: [] });
  };

  async function generatePdf(format: StudyPdfFormat, scope: StudyPdfScope) {
    setGenerating(format);
    setPdfError(null);
    try {
      // Flashcard design candidate, picked via ?cards=1..5 (default 1).
      const style = Number(new URLSearchParams(window.location.search).get("cards"));
      await downloadStudyPdf(format, {
        ...scope,
        cardStyle: (style >= 1 && style <= 5 ? style : 1) as CardStyle,
      });
    } catch (e) {
      setPdfError(
        `PDF generation failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setGenerating(null);
    }
  }

  // The chosen language may not exist in the active bank (e.g. after switching
  // to an untranslated version); fall back to English for display.
  const activeLang = languages.includes(lang) ? lang : DEFAULT_LANG;

  const matchingCardsOfTopic = (topicId: string) =>
    (cardsByTopicId.get(topicId) ?? []).filter((c) =>
      cardMatchesFilters(c, selectedRole, selectedSources, activeBank.sourcesByCardId),
    );

  const roleLabel = selectedRole === "all" ? null : ROLE_LABELS[selectedRole];
  const sourceLabel =
    selectedSources.length === 0
      ? null
      : selectedSources.length === 1
        ? activeBank.contentSources.find((s) => s.id === selectedSources[0])?.name
        : `${selectedSources.length} sources`;
  const importanceLabel =
    selectedImp.length === 0
      ? null
      : selectedImp.length === 1
        ? importanceSummary(selectedImp)
        : `Importance ${[...selectedImp].sort().reverse().join(",")}`;
  const scopeName =
    [roleLabel, sourceLabel, importanceLabel].filter(Boolean).join(" · ") || null;
  const scopeSlug =
    [
      selectedRole === "all" ? null : selectedRole,
      selectedSources.length === 0
        ? null
        : selectedSources.length === 1
          ? selectedSources[0].replace(/[^a-zA-Z0-9_-]+/g, "-")
          : `${selectedSources.length}src`,
      selectedImp.length === 0
        ? null
        : `imp${[...selectedImp].sort().reverse().join("")}`,
    ]
      .filter(Boolean)
      .join("-") || "all";

  const selectedTopic = selectedTopicId
    ? studyTopics.find((t) => t.id === selectedTopicId)
    : null;

  if (selectedTopic) {
    const cards = matchingCardsOfTopic(selectedTopic.id);
    const t = localizeTopic(selectedTopic, activeLang);
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedTopicId(null)}
            className={`${buttonGhost} -ml-3`}
          >
            ← All topics
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <LanguagePicker
              lang={activeLang}
              languages={languages}
              onChange={setLang}
            />
            <PdfButtons
              generating={generating}
              onGenerate={(format) =>
                generatePdf(format, {
                  cardIds: cards.map((c) => c.id),
                  name: t.name,
                  slug: selectedTopic.id,
                  lang: activeLang,
                  topics: activeBank.topics,
                  questions: activeBank.questions,
                })
              }
            />
          </div>
        </div>
        <PageHeader title={t.name} subtitle={t.description || undefined} />
        {pdfError && (
          <p role="alert" className="mb-4 text-sm font-medium text-critical">
            {pdfError}
          </p>
        )}
        {t.studyNotes && <StudyNotes notes={t.studyNotes} />}
        {cards.length > 0 && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Practice checks
          </p>
        )}
        {cards.map((card) => (
          <StudyCard key={card.id} card={localizeCard(card, activeLang)} />
        ))}
      </div>
    );
  }

  // Search looks across everything; otherwise the role/source filters decide
  // what is shown — and exactly that set is exported.
  const searching = query.trim().length > 0;
  const visibleEntries = studyTopics
    .map((topic) => {
      // Match search against what the reader actually sees (the chosen language).
      const localizedName = localizeTopic(topic, activeLang).name;
      const cards = searching
        ? (cardsByTopicId.get(topic.id) ?? []).filter(
            (c) =>
              normalizedIncludes(localizedName, query) ||
              normalizedIncludes(query, localizedName) ||
              cardMatchesQuery(localizeCard(c, activeLang), query),
          )
        : matchingCardsOfTopic(topic.id);
      return { topic, cards };
    })
    // Topics with cards follow the role/source filter; a notes-only topic
    // (no cards anywhere) has no role association, so it is always listed.
    .filter(
      (e) =>
        e.cards.length > 0 ||
        (!searching &&
          e.topic.studyNotes &&
          (cardsByTopicId.get(e.topic.id) ?? []).length === 0),
    )
    // Search deliberately looks across everything; otherwise the importance
    // threshold hides less essential (and unrated) topics.
    .filter((e) => searching || passesImportance(e.topic));

  const byCategory = new Map<
    Topic["category"],
    { topic: Topic; cards: QuestionCard[] }[]
  >();
  for (const e of visibleEntries) {
    byCategory.set(e.topic.category, [
      ...(byCategory.get(e.topic.category) ?? []),
      e,
    ]);
  }

  const exportCardIds = [
    ...new Set(
      studyTopics
        .filter(passesImportance)
        .flatMap((t) => matchingCardsOfTopic(t.id).map((c) => c.id)),
    ),
  ];
  const exportScope: StudyPdfScope = {
    lang: activeLang,
    topics: activeBank.topics,
    questions: activeBank.questions,
    ...(scopeName === null
      ? {}
      : { cardIds: exportCardIds, name: scopeName, slug: scopeSlug }),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Study"
        subtitle="Pick a topic and read the material without being quizzed: each question with what a strong answer covers."
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-xs text-muted">
          Exports {scopeName ?? "everything"}
        </span>
        <PdfButtons
          generating={generating}
          onGenerate={(format) => generatePdf(format, exportScope)}
        />
      </div>

      {pdfError && (
        <p role="alert" className="mb-4 text-sm font-medium text-critical">
          {pdfError}
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Role filter">
        <button
          type="button"
          onClick={() => setSelectedRole("all")}
          aria-pressed={selectedRole === "all"}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            selectedRole === "all" && !searching
              ? "bg-accent text-white"
              : "border border-hairline text-secondary hover:text-foreground"
          }`}
        >
          All roles
        </button>
        {ROLE_TRACKS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setSelectedRole(r)}
            aria-pressed={selectedRole === r}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              selectedRole === r && !searching
                ? "bg-accent text-white"
                : "border border-hairline text-secondary hover:text-foreground"
            }`}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Each label+control pair is one flex unit, so the row wraps between
          controls — a label can never end up on a different line than its
          own select. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-secondary">Source</span>
          <CheckboxDropdown
            ariaLabel="Source filter"
            allLabel="All sources"
            summary={sourceSummary(selectedSources, sourceGroups)}
            groups={sourceGroups}
            selected={selectedSources}
            onChange={setSelectedSources}
          />
        </div>

        {hasImportance && (
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

        <LanguagePicker
          lang={activeLang}
          languages={languages}
          onChange={setLang}
          className="ml-auto"
        />
      </div>

      {devMode && (
        <DevVersionSwitcher
          versionLabel={versionLabel}
          onSelect={setVersion}
          onExit={exitDevMode}
        />
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search all topics and questions…"
        aria-label="Search topics and questions"
        className={`${inputBase} mb-6`}
      />

      {visibleEntries.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-secondary">
            {searching
              ? `Nothing matches "${query}".`
              : "No topics match these filters."}
          </p>
          {!searching && scopeName !== null && (
            <button
              type="button"
              onClick={clearFilters}
              className={buttonSecondary}
            >
              Clear filters ({scopeName})
            </button>
          )}
        </div>
      )}

      {[...byCategory.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([category, entries]) => (
          <section key={category} className="mb-6">
            <h2 className="mb-2 font-bold">{CATEGORY_LABELS[category]}</h2>
            <div className="flex flex-col gap-2">
              {entries
                .map(({ topic, cards }) => ({
                  topic,
                  cards,
                  loc: localizeTopic(topic, activeLang),
                }))
                .sort((a, b) => a.loc.name.localeCompare(b.loc.name))
                .map(({ topic, cards, loc }) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopicId(topic.id)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 text-left hover:bg-background sm:px-5"
                  >
                    <span>
                      <span className="text-sm font-semibold">{loc.name}</span>
                      {loc.description && (
                        <span className="block text-xs text-secondary">
                          {loc.description}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {topic.importance !== undefined && (
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
                      <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-secondary">
                        {cards.length} card{cards.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                ))}
            </div>
          </section>
        ))}
    </div>
  );
}
