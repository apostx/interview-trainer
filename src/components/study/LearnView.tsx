"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
} from "@/components/ui";
import { LanguagePicker } from "@/components/filters";
import type { Bank } from "@/core/content/bank";
import { localizeCard, localizeTopic } from "@/core/content/i18n";
import {
  type NoteBlock,
  type StudySection,
  type StudySectionKind,
  parseKeyTerm,
  parseStudySections,
} from "@/core/content/notes";
import type { LangCode, QuestionCard, Topic, TopicStatus } from "@/core/models";
import {
  getTopicsById,
  listDuePracticeItems,
  saveTopic,
} from "@/core/storage/repositories";

/**
 * The "Learning" Study UI variant: recall-first reading with semantic
 * section blocks and a learning-ordered topic list. The classic UI stays
 * available as the browsing/library view (dev-mode switcher, ?ui=learn).
 */

const IMPORTANCE_NAMES: Record<number, string> = {
  5: "Essential",
  4: "Recommended",
  3: "Useful",
  2: "Specialized",
  1: "Reference",
};

const CATEGORY_NAMES: Record<Topic["category"], string> = {
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

// Semantic styling per information type: coloured left border + faint tint
// + icon; every block also carries its heading, so colour is never the only
// signal. Key terms and unknown sections stay neutral.
const SECTION_STYLE: Record<
  StudySectionKind,
  { icon: string; border: string; bg: string }
> = {
  definition: { icon: "📖", border: "border-l-sem-definition", bg: "bg-sem-definition-bg" },
  problem: { icon: "🎯", border: "border-l-sem-problem", bg: "bg-sem-problem-bg" },
  mechanism: { icon: "⚙️", border: "border-l-sem-mechanism", bg: "bg-sem-mechanism-bg" },
  mistakes: { icon: "⚠️", border: "border-l-sem-mistake", bg: "bg-sem-mistake-bg" },
  terms: { icon: "🔑", border: "border-l-hairline", bg: "bg-surface" },
  other: { icon: "•", border: "border-l-hairline", bg: "bg-surface" },
};

type LearnStatus = "due" | "in_progress" | "learned" | "not_started";

const STATUS_BADGE: Record<LearnStatus, { label: string; className: string }> = {
  due: { label: "Review due", className: "text-warning" },
  in_progress: { label: "In progress", className: "text-accent" },
  learned: { label: "Learned", className: "text-good-text" },
  not_started: { label: "Not started", className: "text-muted" },
};

function learnStatus(status: TopicStatus | undefined, due: boolean): LearnStatus {
  if (due) return "due";
  if (status === "interview_ready") return "learned";
  if (status && status !== "unknown") return "in_progress";
  return "not_started";
}

function ImportanceBadge({ importance }: { importance?: number }) {
  if (importance === undefined) return null;
  return (
    <span
      title={`Interview importance ${importance}/5`}
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        importance >= 4 ? "bg-accent/15 text-accent" : "bg-background text-muted"
      }`}
    >
      {IMPORTANCE_NAMES[importance]}
    </span>
  );
}

function Blocks({ blocks, numbered }: { blocks: NoteBlock[]; numbered?: boolean }) {
  return (
    <>
      {blocks.map((block, i) =>
        block.type === "p" ? (
          <p key={i} className="text-sm leading-relaxed text-secondary">
            {block.text}
          </p>
        ) : block.type === "ul" && numbered ? (
          <ol key={i} className="flex flex-col gap-2">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-3 text-sm leading-relaxed text-secondary">
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-sem-mechanism/15 text-center text-xs font-bold leading-5 text-sem-mechanism">
                  {j + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        ) : block.type === "ul" ? (
          <ul key={i} className="flex list-disc flex-col gap-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j} className="text-sm leading-relaxed text-secondary">
                {item}
              </li>
            ))}
          </ul>
        ) : null,
      )}
    </>
  );
}

function TermCards({ blocks }: { blocks: NoteBlock[] }) {
  const items = blocks.flatMap((b) => (b.type === "ul" ? b.items : []));
  const leads = blocks.filter((b) => b.type === "p");
  return (
    <>
      <Blocks blocks={leads} />
      <dl className="grid gap-2 sm:grid-cols-2">
        {items.map((item, i) => {
          const { term, def } = parseKeyTerm(item);
          return (
            <div key={i} className="rounded-lg border border-hairline bg-background px-3 py-2">
              <dt className="text-sm font-semibold">{term}</dt>
              {def && <dd className="mt-0.5 text-sm leading-relaxed text-secondary">{def}</dd>}
            </div>
          );
        })}
      </dl>
    </>
  );
}

/** One studyNotes section as a collapsible, semantically coloured block. */
function SectionBlock({ section, defaultOpen }: { section: StudySection; defaultOpen: boolean }) {
  const style = SECTION_STYLE[section.kind];
  return (
    <details
      open={defaultOpen}
      className={`rounded-xl border border-hairline border-l-4 ${style.border} ${style.bg}`}
    >
      <summary className="cursor-pointer select-none list-none px-4 py-3 font-bold [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="mr-2">{style.icon}</span>
        {section.title || "Notes"}
        <span aria-hidden className="float-right text-xs font-normal text-muted">▾</span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {section.kind === "terms" ? (
          <TermCards blocks={section.blocks} />
        ) : (
          <Blocks blocks={section.blocks} numbered={section.kind === "mechanism"} />
        )}
      </div>
    </details>
  );
}

/** "Think first": shows a connected question before revealing the notes. */
function RecallGate({ prompt, onReveal }: { prompt: string; onReveal: () => void }) {
  return (
    <div className="rounded-xl border border-hairline border-l-4 border-l-sem-recall bg-sem-recall-bg px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-sem-recall">
        🧠 Before reading, try to answer
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed">{prompt}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onReveal} className={buttonPrimary}>
          Show the explanation
        </button>
        <button type="button" onClick={onReveal} className={buttonSecondary}>
          I don&apos;t know yet
        </button>
      </div>
    </div>
  );
}

/** End-of-topic recall check with reveal + self-rating into topic status. */
function RecallCheck({
  card,
  onRate,
  savedLabel,
  onNext,
  hasNext,
}: {
  card: QuestionCard;
  onRate: (rating: "missed" | "partial" | "confident") => void;
  savedLabel: string | null;
  onNext: () => void;
  hasNext: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-xl border border-hairline border-l-4 border-l-sem-recall bg-sem-recall-bg px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-sem-recall">
        🧠 Recall check — answer out loud, then reveal
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed">{card.prompt}</p>
      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className={`${buttonPrimary} mt-4`}
        >
          Reveal expected points
        </button>
      ) : (
        <>
          <ul className="mt-3 flex flex-col gap-1.5">
            {card.expectedPoints.map((p) => (
              <li key={p.id} className="text-sm leading-relaxed">
                <span className="font-medium">☑ {p.label}</span>
                {p.description && (
                  <span className="block pl-5 text-secondary">{p.description}</span>
                )}
              </li>
            ))}
          </ul>
          {savedLabel === null ? (
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-medium text-secondary">
                How did it go?
              </legend>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onRate("missed")} className={buttonSecondary}>
                  I couldn&apos;t answer
                </button>
                <button type="button" onClick={() => onRate("partial")} className={buttonSecondary}>
                  Partly remembered
                </button>
                <button type="button" onClick={() => onRate("confident")} className={buttonSecondary}>
                  Confidently remembered
                </button>
              </div>
            </fieldset>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-good-text">
                Saved ✓ {savedLabel}
              </span>
              {hasNext && (
                <button type="button" onClick={onNext} className={buttonPrimary}>
                  Next topic →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Entry = { topic: Topic; cards: QuestionCard[]; status: LearnStatus };

function TopicRow({
  entry,
  lang,
  onOpen,
}: {
  entry: Entry;
  lang: LangCode;
  onOpen: (id: string) => void;
}) {
  const loc = localizeTopic(entry.topic, lang);
  const badge = STATUS_BADGE[entry.status];
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.topic.id)}
      className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 text-left hover:bg-background sm:px-5"
    >
      <span className="min-w-0">
        <span className="text-sm font-semibold">{loc.name}</span>
        {loc.description && (
          <span className="block text-xs text-secondary">{loc.description}</span>
        )}
        <span className="mt-1 block text-[11px] text-muted">
          {CATEGORY_NAMES[entry.topic.category]}
          {entry.cards.length > 0 &&
            ` · ${entry.cards.length} practice question${entry.cards.length === 1 ? "" : "s"}`}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <ImportanceBadge importance={entry.topic.importance} />
        <span className={`text-xs font-medium ${badge.className}`}>{badge.label}</span>
      </span>
    </button>
  );
}

function ListSection({ title, entries, lang, onOpen }: {
  title: string;
  entries: Entry[];
  lang: LangCode;
  onOpen: (id: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-bold">{title}</h2>
      <div className="flex flex-col gap-2">
        {entries.map((e) => (
          <TopicRow key={e.topic.id} entry={e} lang={lang} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function CollapsedListSection(props: {
  title: string;
  entries: Entry[];
  lang: LangCode;
  onOpen: (id: string) => void;
}) {
  if (props.entries.length === 0) return null;
  return (
    <details className="mb-6">
      <summary className="mb-2 cursor-pointer select-none font-bold">
        {props.title} ({props.entries.length})
      </summary>
      <div className="flex flex-col gap-2">
        {props.entries.map((e) => (
          <TopicRow key={e.topic.id} entry={e} lang={props.lang} onOpen={props.onOpen} />
        ))}
      </div>
    </details>
  );
}

export function LearnView({
  bank,
  lang,
  languages,
  onLangChange,
  selectedTopicId,
  onSelectTopic,
  devControls,
}: {
  bank: Bank;
  lang: LangCode;
  languages: LangCode[];
  onLangChange: (lang: LangCode) => void;
  selectedTopicId: string | null;
  onSelectTopic: (id: string | null) => void;
  devControls?: ReactNode;
}) {
  // The learner's saved state: topic statuses from IndexedDB plus which
  // topics have a due practice item (the spaced-repetition signal).
  const [userState, setUserState] = useState<Map<
    string,
    { status: TopicStatus; due: boolean }
  > | null>(null);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [byId, dueItems] = await Promise.all([
        getTopicsById(),
        listDuePracticeItems(new Date().toISOString()),
      ]);
      if (cancelled) return;
      const dueTopicIds = new Set(dueItems.flatMap((i) => i.topicIds));
      const state = new Map<string, { status: TopicStatus; due: boolean }>();
      for (const [id, t] of byId) state.set(id, { status: t.status, due: dueTopicIds.has(id) });
      for (const id of dueTopicIds) {
        if (!state.has(id)) state.set(id, { status: "unknown", due: true });
      }
      setUserState(state);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { entries, groups } = useMemo(() => {
    const cardsByTopicId = new Map<string, QuestionCard[]>();
    for (const card of bank.questions) {
      for (const topicId of card.topicIds) {
        cardsByTopicId.set(topicId, [...(cardsByTopicId.get(topicId) ?? []), card]);
      }
    }
    const entries: Entry[] = bank.topics
      .filter((t) => cardsByTopicId.has(t.id) || t.studyNotes)
      .map((topic) => {
        const s = userState?.get(topic.id);
        return {
          topic,
          cards: cardsByTopicId.get(topic.id) ?? [],
          status: learnStatus(s?.status, s?.due ?? false),
        };
      });
    // Learning order: due reviews, then in-progress, then untouched topics
    // by importance; learned topics sink to the bottom.
    const byImportance = (a: Entry, b: Entry) =>
      (b.topic.importance ?? 0) - (a.topic.importance ?? 0) ||
      a.topic.name.localeCompare(b.topic.name);
    const groups = {
      due: entries.filter((e) => e.status === "due").sort(byImportance),
      inProgress: entries.filter((e) => e.status === "in_progress").sort(byImportance),
      essential: entries
        .filter((e) => e.status === "not_started" && e.topic.importance === 5)
        .sort(byImportance),
      recommended: entries
        .filter((e) => e.status === "not_started" && e.topic.importance === 4)
        .sort(byImportance),
      rest: entries
        .filter((e) => e.status === "not_started" && (e.topic.importance ?? 0) < 4)
        .sort(byImportance),
      learned: entries.filter((e) => e.status === "learned").sort(byImportance),
    };
    return { entries, groups };
  }, [bank, userState]);

  // Flat learning order, used for prev/next navigation in the detail view.
  const orderedIds = useMemo(
    () =>
      [
        ...groups.due,
        ...groups.inProgress,
        ...groups.essential,
        ...groups.recommended,
        ...groups.rest,
        ...groups.learned,
      ].map((e) => e.topic.id),
    [groups],
  );

  const selected = selectedTopicId
    ? entries.find((e) => e.topic.id === selectedTopicId)
    : undefined;

  // Recall-first: hide the notes until the learner tried to answer once.
  const [revealedTopicId, setRevealedTopicId] = useState<string | null>(null);

  // "Next topic" is snapshotted when a topic is opened: rating a topic moves
  // it within the learning order, but the queue position must not jump.
  const [nextSnapshot, setNextSnapshot] = useState<{
    forTopic: string;
    next: string | undefined;
  } | null>(null);

  const openTopic = (id: string | null) => {
    setSavedLabel(null);
    if (id) {
      const idx = orderedIds.indexOf(id);
      setNextSnapshot({
        forTopic: id,
        next: idx >= 0 ? orderedIds[idx + 1] : undefined,
      });
    } else {
      setNextSnapshot(null);
    }
    onSelectTopic(id);
  };

  async function rate(entry: Entry, rating: "missed" | "partial" | "confident") {
    const map: Record<string, { status: TopicStatus; conf: 1 | 2 | 3 | 4 | 5; label: string }> = {
      missed: { status: "basic_understanding", conf: 2, label: "marked as in progress" },
      partial: { status: "can_explain", conf: 3, label: "marked as in progress" },
      confident: { status: "interview_ready", conf: 5, label: "marked as learned" },
    };
    const { status, conf, label } = map[rating];
    await saveTopic({ ...entry.topic, status, userConfidence: conf });
    setUserState((prev) => {
      const next = new Map(prev ?? []);
      next.set(entry.topic.id, { status, due: prev?.get(entry.topic.id)?.due ?? false });
      return next;
    });
    setSavedLabel(label);
  }

  if (selected) {
    const loc = localizeTopic(selected.topic, lang);
    const sections = loc.studyNotes ? parseStudySections(loc.studyNotes) : [];
    const firstCard = selected.cards[0]
      ? localizeCard(selected.cards[0], lang)
      : null;
    const revealed = revealedTopicId === selected.topic.id || !firstCard || sections.length === 0;
    // Deep links land here without a snapshot; fall back to the live order.
    const nextId =
      nextSnapshot?.forTopic === selected.topic.id
        ? nextSnapshot.next
        : orderedIds[orderedIds.indexOf(selected.topic.id) + 1];
    const badge = STATUS_BADGE[selected.status];
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => openTopic(null)} className={`${buttonGhost} -ml-3`}>
            ← All topics
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <LanguagePicker lang={lang} languages={languages} onChange={onLangChange} />
            {nextId && (
              <button type="button" onClick={() => openTopic(nextId)} className={buttonGhost}>
                Next topic →
              </button>
            )}
          </div>
        </div>
        <PageHeader title={loc.name} />
        <p className="-mt-4 mb-4 text-xs text-muted">
          {CATEGORY_NAMES[selected.topic.category]}
          {selected.topic.importance !== undefined &&
            ` · ${IMPORTANCE_NAMES[selected.topic.importance]}`}
          {selected.cards.length > 0 &&
            ` · ${selected.cards.length} practice question${selected.cards.length === 1 ? "" : "s"}`}
          {" · "}
          <span className={badge.className}>{badge.label}</span>
        </p>

        {loc.description && (
          <div className="mb-4 rounded-xl border border-hairline border-l-4 border-l-sem-definition bg-sem-definition-bg px-4 py-3">
            <p className="text-sm font-medium leading-relaxed">{loc.description}</p>
          </div>
        )}

        {!revealed && firstCard ? (
          <RecallGate
            prompt={firstCard.prompt}
            onReveal={() => setRevealedTopicId(selected.topic.id)}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {sections.map((section, i) => (
                <SectionBlock
                  key={i}
                  section={section}
                  defaultOpen={section.kind === "definition" || section.kind === "problem"}
                />
              ))}
            </div>
            {firstCard && (
              <div className="mt-4">
                <RecallCheck
                  card={firstCard}
                  onRate={(r) => rate(selected, r)}
                  savedLabel={savedLabel}
                  onNext={() => nextId && openTopic(nextId)}
                  hasNext={nextId !== undefined}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <PageHeader
        title="Study"
        subtitle="Learning mode: recall first, then read — ordered by what needs you most."
      />
      {devControls}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {entries.length} topics · rate yourself at the end of each one to track progress
        </p>
        <LanguagePicker lang={lang} languages={languages} onChange={onLangChange} />
      </div>
      {userState === null ? (
        <p className="py-10 text-center text-sm text-secondary">Loading…</p>
      ) : (
        <>
          <ListSection title="Review due" entries={groups.due} lang={lang} onOpen={openTopic} />
          <ListSection title="Continue learning" entries={groups.inProgress} lang={lang} onOpen={openTopic} />
          <ListSection title="Essentials" entries={groups.essential} lang={lang} onOpen={openTopic} />
          <ListSection title="Recommended" entries={groups.recommended} lang={lang} onOpen={openTopic} />
          {/* In an unrated bank everything would land here — keep it open then. */}
          {groups.essential.length + groups.recommended.length > 0 ? (
            <CollapsedListSection title="More topics" entries={groups.rest} lang={lang} onOpen={openTopic} />
          ) : (
            <ListSection title="Topics" entries={groups.rest} lang={lang} onOpen={openTopic} />
          )}
          <CollapsedListSection title="Learned" entries={groups.learned} lang={lang} onOpen={openTopic} />
        </>
      )}
    </div>
  );
}
