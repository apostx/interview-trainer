"use client";

import { useEffect, useState } from "react";
import { Card, ModeBadge, PageHeader, buttonGhost, inputBase, selectCompact } from "@/components/ui";
import type { InterviewRole, LangCode, QuestionCard, Topic } from "@/core/models";
import { ROLE_LABELS, ROLE_TRACKS, TRACK_MEMBER_ROLES } from "@/core/models";
import {
  allQuestions,
  allTopics,
  contentSources,
  sourcesByCardId,
} from "@/core/content/bank";
import {
  availableLanguages,
  DEFAULT_LANG,
  languageLabel,
  localizeCard,
  localizeTopic,
} from "@/core/content/i18n";
import {
  downloadStudyPdf,
  type StudyPdfFormat,
  type StudyPdfScope,
} from "@/core/pdf/studyPdf";
import { parseStudyNotes } from "@/core/content/notes";
import { normalizedIncludes } from "@/core/services/transcriptNormalizer";
import { getSettings } from "@/core/storage/repositories";

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

// Static content — computed once at module load.
const cardsByTopicId = new Map<string, QuestionCard[]>();
for (const card of allQuestions) {
  for (const topicId of card.topicIds) {
    cardsByTopicId.set(topicId, [...(cardsByTopicId.get(topicId) ?? []), card]);
  }
}
const studyTopics = allTopics.filter(
  (t) => cardsByTopicId.has(t.id) || t.studyNotes,
);

// Languages any content provides (always includes English). The selector is
// hidden until at least one translation exists.
const LANGUAGES = availableLanguages(allTopics, allQuestions);
const LANG_STORAGE_KEY = "study-lang";

// Source dropdown: root files flat first, then subfolders as groups.
const sourceGroups: [string, { id: string; name: string }[]][] = (() => {
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const src of contentSources) {
    groups.set(src.group, [
      ...(groups.get(src.group) ?? []),
      { id: src.id, name: src.name },
    ]);
  }
  return [...groups.entries()].sort();
})();

type RoleFilter = InterviewRole | "all";
type SourceFilter = string; // "all" or a source id

/** Role and source filters apply per card; a topic shows if any card survives. */
function cardMatchesFilters(
  card: QuestionCard,
  role: RoleFilter,
  source: SourceFilter,
): boolean {
  if (role !== "all") {
    const members = TRACK_MEMBER_ROLES[role] ?? [role];
    if (!card.roles.some((r) => members.includes(r))) return false;
  }
  if (source !== "all" && !sourcesByCardId.get(card.id)?.includes(source)) {
    return false;
  }
  return true;
}

function cardMatchesQuery(card: QuestionCard, query: string): boolean {
  return (
    normalizedIncludes(card.title, query) || normalizedIncludes(card.prompt, query)
  );
}

function StudyNotes({ notes }: { notes: string }) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      {parseStudyNotes(notes).map((block, i) =>
        block.type === "h" ? (
          <h2 key={i} className="mt-2 font-bold">
            {block.text}
          </h2>
        ) : block.type === "p" ? (
          <p key={i} className="text-sm leading-relaxed text-secondary">
            {block.text}
          </p>
        ) : (
          <ul key={i} className="flex list-disc flex-col gap-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j} className="text-sm leading-relaxed text-secondary">
                {item}
              </li>
            ))}
          </ul>
        ),
      )}
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
  onChange,
  className,
}: {
  lang: LangCode;
  onChange: (lang: LangCode) => void;
  className?: string;
}) {
  if (LANGUAGES.length < 2) return null;
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
        {LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {languageLabel(code)}
          </option>
        ))}
      </select>
    </div>
  );
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
    </div>
  );
}

// Reads the Study view state out of the current query string.
function readUrlState() {
  const p = new URLSearchParams(window.location.search);
  return {
    topicId: p.get("topic"),
    role: (p.get("role") as RoleFilter | null) ?? null,
    source: p.get("source") ?? "all",
    query: p.get("q") ?? "",
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
  const [selectedSource, setSourceState] = useState<SourceFilter>("all");
  const [query, setQueryState] = useState("");
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);
  const [generating, setGenerating] = useState<StudyPdfFormat | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Study reading language is a preference (persisted), not view navigation,
  // so it lives in localStorage rather than the URL.
  const setLang = (l: LangCode) => {
    setLangState(l);
    localStorage.setItem(LANG_STORAGE_KEY, l);
  };

  // On mount, load the persisted language and read the URL; then re-read the
  // URL whenever the user navigates with the browser back/forward buttons.
  useEffect(() => {
    const syncUrl = () => {
      const s = readUrlState();
      setTopicId(s.topicId);
      setRoleParam(s.role);
      setSourceState(s.source);
      setQueryState(s.query);
    };
    const init = () => {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved && LANGUAGES.includes(saved)) setLangState(saved);
      syncUrl();
    };
    init();
    window.addEventListener("popstate", syncUrl);
    return () => window.removeEventListener("popstate", syncUrl);
  }, []);

  // The role filter defaults to the user's target role until they pick one
  // (an explicit choice — including "all" — is written to the URL and wins).
  const [defaultRole, setDefaultRole] = useState<RoleFilter>("all");
  useEffect(() => {
    let cancelled = false;
    getSettings().then((s) => {
      if (!cancelled) setDefaultRole(s.targetRole);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRole: RoleFilter = roleParam ?? defaultRole;

  // Writes the given params to the URL, dropping any set to null/"". Filters
  // replace the entry (view state); opening/closing a topic pushes one (so the
  // back button returns to the list).
  function writeUrl(patch: Record<string, string | null>, push = false) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }

  const setQuery = (q: string) => {
    setQueryState(q);
    writeUrl({ q: q || null });
  };
  const setSelectedRole = (role: RoleFilter) => {
    setRoleParam(role);
    writeUrl({ role });
  };
  const setSelectedSource = (source: SourceFilter) => {
    setSourceState(source);
    writeUrl({ source: source === "all" ? null : source });
  };
  const setSelectedTopicId = (id: string | null) => {
    setTopicId(id);
    writeUrl({ topic: id }, true);
  };

  async function generatePdf(format: StudyPdfFormat, scope: StudyPdfScope) {
    setGenerating(format);
    setPdfError(null);
    try {
      await downloadStudyPdf(format, scope);
    } catch (e) {
      setPdfError(
        `PDF generation failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setGenerating(null);
    }
  }

  const matchingCardsOfTopic = (topicId: string) =>
    (cardsByTopicId.get(topicId) ?? []).filter((c) =>
      cardMatchesFilters(c, selectedRole, selectedSource),
    );

  const roleLabel = selectedRole === "all" ? null : ROLE_LABELS[selectedRole];
  const sourceLabel =
    selectedSource === "all"
      ? null
      : contentSources.find((s) => s.id === selectedSource)?.name;
  const scopeName = [roleLabel, sourceLabel].filter(Boolean).join(" · ") || null;
  const scopeSlug =
    [
      selectedRole === "all" ? null : selectedRole,
      selectedSource === "all" ? null : selectedSource,
    ]
      .filter(Boolean)
      .join("-") || "all";

  const selectedTopic = selectedTopicId
    ? studyTopics.find((t) => t.id === selectedTopicId)
    : null;

  if (selectedTopic) {
    const cards = matchingCardsOfTopic(selectedTopic.id);
    const t = localizeTopic(selectedTopic, lang);
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
            <LanguagePicker lang={lang} onChange={setLang} />
            <PdfButtons
              generating={generating}
              onGenerate={(format) =>
                generatePdf(format, {
                  cardIds: cards.map((c) => c.id),
                  name: t.name,
                  slug: selectedTopic.id,
                  lang,
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
          <StudyCard key={card.id} card={localizeCard(card, lang)} />
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
      const localizedName = localizeTopic(topic, lang).name;
      const cards = searching
        ? (cardsByTopicId.get(topic.id) ?? []).filter(
            (c) =>
              normalizedIncludes(localizedName, query) ||
              normalizedIncludes(query, localizedName) ||
              cardMatchesQuery(localizeCard(c, lang), query),
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
    );

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
      studyTopics.flatMap((t) => matchingCardsOfTopic(t.id).map((c) => c.id)),
    ),
  ];
  const exportScope: StudyPdfScope =
    scopeName === null
      ? { lang }
      : { cardIds: exportCardIds, name: scopeName, slug: scopeSlug, lang };

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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-secondary" htmlFor="source-filter">
          Source
        </label>
        <select
          id="source-filter"
          className={selectCompact}
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
        >
          <option value="all">All sources</option>
          {sourceGroups.map(([group, entries]) =>
            group === "" ? (
              entries.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            ) : (
              <optgroup key={group} label={group}>
                {entries.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ),
          )}
        </select>

        <LanguagePicker lang={lang} onChange={setLang} className="ml-auto" />
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search all topics and questions…"
        aria-label="Search topics and questions"
        className={`${inputBase} mb-6`}
      />

      {visibleEntries.length === 0 && (
        <p className="py-10 text-center text-sm text-secondary">
          {searching
            ? `Nothing matches "${query}".`
            : "No topics match these filters."}
        </p>
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
                  loc: localizeTopic(topic, lang),
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
                    <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-secondary">
                      {cards.length} card{cards.length === 1 ? "" : "s"}
                    </span>
                  </button>
                ))}
            </div>
          </section>
        ))}
    </div>
  );
}
