"use client";

import { create } from "zustand";
import type {
  FollowUpAnswer,
  FollowUpQuestion,
  InterviewSession,
  QuestionCard,
  RubricStatus,
  Topic,
  UserSettings,
} from "@/core/models";
import { getCard } from "@/core/content/bank";
import {
  applyManualOverride,
  collectWeakTopicIds,
  computeOverallScore,
  reviewAnswerHybrid,
} from "@/core/services/answerReviewer";
import { selectFollowUps } from "@/core/services/followUpSelector";
import { buildLearningItems } from "@/core/services/learningItems";
import { matchRubric } from "@/core/services/rubricMatcher";
import {
  getSession,
  getSettings,
  getTopicsById,
  savePracticeItems,
  saveSession,
  saveTopic,
} from "@/core/storage/repositories";
import { useEmbeddingStore } from "./embeddingStore";

export type RunnerPhase =
  | "loading"
  | "error"
  | "question"
  | "reviewed"
  | "followup"
  | "finished";

type RunnerState = {
  session: InterviewSession | null;
  settings: UserSettings | null;
  topicsById: Map<string, Topic>;
  currentIndex: number;
  phase: RunnerPhase;
  thinkingStartedAt: number;
  currentFollowUp: FollowUpQuestion | null;
  followUpResult: FollowUpAnswer | null;
  /** True once "I don't know this topic" was used on the current question. */
  markedUnknown: boolean;
  error: string | null;

  load: (sessionId: string) => Promise<void>;
  currentCard: () => QuestionCard | null;
  submitAnswer: (transcript: string) => Promise<void>;
  overrideRubric: (rubricItemId: string, status: RubricStatus) => Promise<void>;
  markTopicsUnknown: () => Promise<void>;
  continueAfterReview: () => Promise<void>;
  submitFollowUpAnswer: (transcript: string) => Promise<void>;
  finishFollowUp: () => Promise<void>;
  skipQuestion: () => Promise<void>;
};

export const useSessionRunner = create<RunnerState>((set, get) => {
  async function persist(session: InterviewSession) {
    await saveSession(session);
    set({ session: { ...session } });
  }

  async function advance(session: InterviewSession, fromIndex: number) {
    const nextIndex = fromIndex + 1;
    if (nextIndex >= session.questions.length) {
      const allCards = new Map(
        session.questions
          .map((q) => getCard(q.questionCardId))
          .filter((c): c is QuestionCard => Boolean(c))
          .map((c) => [c.id, c]),
      );
      session.endedAt = new Date().toISOString();
      session.overallScore = { totalScore: computeOverallScore(session) };
      session.weakTopicIds = collectWeakTopicIds(session, allCards);
      await persist(session);
      set({ phase: "finished", currentFollowUp: null, followUpResult: null });
      return;
    }
    session.questions[nextIndex].status = "thinking";
    session.questions[nextIndex].startedAt = new Date().toISOString();
    await persist(session);
    set({
      currentIndex: nextIndex,
      phase: "question",
      thinkingStartedAt: Date.now(),
      currentFollowUp: null,
      followUpResult: null,
      markedUnknown: false,
    });
  }

  return {
    session: null,
    settings: null,
    topicsById: new Map(),
    currentIndex: 0,
    phase: "loading",
    thinkingStartedAt: 0,
    currentFollowUp: null,
    followUpResult: null,
    markedUnknown: false,
    error: null,

    load: async (sessionId) => {
      set({
        phase: "loading",
        error: null,
        currentFollowUp: null,
        followUpResult: null,
        markedUnknown: false,
      });
      try {
        const [session, settings, topicsById] = await Promise.all([
          getSession(sessionId),
          getSettings(),
          getTopicsById(),
        ]);
        if (!session) {
          set({ phase: "error", error: "Session not found." });
          return;
        }
        if (session.endedAt) {
          set({ session, settings, topicsById, phase: "finished" });
          return;
        }
        const firstOpen = session.questions.findIndex(
          (q) => q.status !== "reviewed" && q.status !== "skipped",
        );
        if (firstOpen === -1) {
          set({ session, settings, topicsById, currentIndex: 0, phase: "loading" });
          await advance(session, session.questions.length - 1);
          return;
        }
        session.questions[firstOpen].status = "thinking";
        session.questions[firstOpen].startedAt ??= new Date().toISOString();
        await saveSession(session);
        set({
          session,
          settings,
          topicsById,
          currentIndex: firstOpen,
          phase: "question",
          thinkingStartedAt: Date.now(),
        });
      } catch (error) {
        set({
          phase: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },

    currentCard: () => {
      const { session, currentIndex } = get();
      const q = session?.questions[currentIndex];
      return q ? (getCard(q.questionCardId) ?? null) : null;
    },

    submitAnswer: async (transcript) => {
      const { session, currentIndex, settings, topicsById } = get();
      const card = get().currentCard();
      if (!session || !card || !settings) return;

      const nowIso = new Date().toISOString();
      // Hybrid matching: keywords + local semantic similarity, with a
      // keyword-only fallback inside if the embedding model fails.
      const { review, practiceItems } = await reviewAnswerHybrid(
        card,
        transcript,
        session.role,
        nowIso,
        useEmbeddingStore.getState().embed,
      );

      const followUps = settings.autoGenerateFollowUps
        ? selectFollowUps(card, transcript, {
            coveredRubricItemIds: review.coveredRubricItemIds,
            weakRubricItemIds: review.weakRubricItemIds,
            missingRubricItemIds: review.missingRubricItemIds,
          }, topicsById, 1)
        : [];

      const question = session.questions[currentIndex];
      question.status = "reviewed";
      question.transcript = transcript;
      question.answeredAt = nowIso;
      question.review = review;
      question.followUpQuestionIds = followUps.map((f) => f.id);

      await savePracticeItems(practiceItems);
      await persist(session);
      set({ phase: "reviewed", currentFollowUp: followUps[0] ?? null });
    },

    overrideRubric: async (rubricItemId, status) => {
      const { session, currentIndex } = get();
      const card = get().currentCard();
      const question = session?.questions[currentIndex];
      if (!session || !card || !question?.review) return;
      question.review = applyManualOverride(
        card,
        question.review,
        rubricItemId,
        status,
        session.role,
      );
      await persist(session);
    },

    markTopicsUnknown: async () => {
      const { topicsById, markedUnknown } = get();
      const card = get().currentCard();
      if (!card || markedUnknown) return;

      const nowIso = new Date().toISOString();
      // Only the card's primary topic — the button says "this topic", and
      // secondary topics are often broad areas the user does know.
      const topics = card.topicIds
        .slice(0, 1)
        .map((id) => topicsById.get(id))
        .filter((t): t is NonNullable<typeof t> => Boolean(t));

      // Spec §8 unknown-topic pipeline: the topic drops out of regular
      // sessions until re-learned, and learning cards land in the queue.
      for (const topic of topics) {
        const updated = { ...topic, status: "unknown" as const, userConfidence: 1 as const };
        await saveTopic(updated);
        topicsById.set(topic.id, updated);
        await savePracticeItems(buildLearningItems(updated, nowIso));
      }
      set({ markedUnknown: true, topicsById: new Map(topicsById) });
    },

    continueAfterReview: async () => {
      const { session, currentIndex, currentFollowUp } = get();
      if (!session) return;
      if (currentFollowUp) {
        set({ phase: "followup", followUpResult: null });
        return;
      }
      await advance(session, currentIndex);
    },

    submitFollowUpAnswer: async (transcript) => {
      const { session, currentIndex, currentFollowUp } = get();
      if (!session || !currentFollowUp) return;
      const match = matchRubric(transcript, currentFollowUp.expectedPoints);
      const result: FollowUpAnswer = {
        followUpId: currentFollowUp.id,
        prompt: currentFollowUp.prompt,
        transcript,
        coveredRubricItemIds: match.coveredRubricItemIds,
        missingRubricItemIds: match.missingRubricItemIds,
      };
      const question = session.questions[currentIndex];
      question.followUpAnswers = [...(question.followUpAnswers ?? []), result];
      await persist(session);
      set({ followUpResult: result });
    },

    finishFollowUp: async () => {
      const { session, currentIndex } = get();
      if (!session) return;
      await advance(session, currentIndex);
    },

    skipQuestion: async () => {
      const { session, currentIndex } = get();
      if (!session) return;
      session.questions[currentIndex].status = "skipped";
      await advance(session, currentIndex);
    },
  };
});
