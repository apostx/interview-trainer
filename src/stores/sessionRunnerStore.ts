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
  reviewAnswer,
} from "@/core/services/answerReviewer";
import { selectFollowUps } from "@/core/services/followUpSelector";
import { matchRubric } from "@/core/services/rubricMatcher";
import {
  getSession,
  getSettings,
  getTopicsById,
  savePracticeItems,
  saveSession,
} from "@/core/storage/repositories";

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
  error: string | null;

  load: (sessionId: string) => Promise<void>;
  currentCard: () => QuestionCard | null;
  submitAnswer: (transcript: string) => Promise<void>;
  overrideRubric: (rubricItemId: string, status: RubricStatus) => Promise<void>;
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
    error: null,

    load: async (sessionId) => {
      set({ phase: "loading", error: null, currentFollowUp: null, followUpResult: null });
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
      const { review, practiceItems } = reviewAnswer(
        card,
        transcript,
        session.role,
        nowIso,
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
