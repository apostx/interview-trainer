"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnswerCapture } from "@/components/AnswerCapture";
import { RubricChecklist } from "@/components/RubricChecklist";
import { CountdownTimer } from "@/components/Timer";
import {
  Card,
  ModeBadge,
  ScoreBadge,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
} from "@/components/ui";
import { ROLE_LABELS } from "@/core/models";
import { effectiveLocalModel } from "@/core/speech/audioUtils";
import { useEmbeddingStore } from "@/stores/embeddingStore";
import { useSessionRunner } from "@/stores/sessionRunnerStore";
import { useTranscriberStore } from "@/stores/transcriberStore";

function SessionRunner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");
  const router = useRouter();
  const runner = useSessionRunner();
  const loadModel = useTranscriberStore((s) => s.load);
  // Tracks which question the hint was opened for, so it resets per question.
  const [hintShownForIndex, setHintShownForIndex] = useState<number | null>(null);
  const showHint = hintShownForIndex === runner.currentIndex;

  useEffect(() => {
    if (sessionId) runner.load(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const loadEmbeddings = useEmbeddingStore((s) => s.load);

  // Preload models in the background so the first answer and its semantic
  // review are smooth. Whisper is only eagerly loaded when it is the active
  // engine — on phones the extra model in memory was crashing the tab.
  useEffect(() => {
    if (runner.settings) {
      if (runner.settings.speechEngine === "whisper") {
        loadModel(effectiveLocalModel(runner.settings.preferredSpeechModel)).catch(() => {});
      }
      loadEmbeddings().catch(() => {});
    }
  }, [runner.settings, loadModel, loadEmbeddings]);

  useEffect(() => {
    if (runner.phase === "finished" && runner.session) {
      router.replace(`/session/summary?id=${runner.session.id}`);
    }
  }, [runner.phase, runner.session, router]);

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-semibold text-critical">No session id given.</p>
        <Link href="/setup" className={`${buttonSecondary} mt-4 inline-block`}>
          Set up a session
        </Link>
      </div>
    );
  }

  if (runner.phase === "loading" || runner.phase === "finished") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-secondary">
        Loading session…
      </div>
    );
  }

  if (runner.phase === "error" || !runner.session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-semibold text-critical">
          {runner.error ?? "Something went wrong."}
        </p>
        <Link href="/" className={`${buttonSecondary} mt-4 inline-block`}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  const session = runner.session;
  const card = runner.currentCard();
  const question = session.questions[runner.currentIndex];
  if (!card || !question) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-critical">
        Question card not found.
      </div>
    );
  }

  const progressText = `Question ${runner.currentIndex + 1} of ${session.questions.length}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-secondary">
          <span className="font-semibold text-foreground">
            {ROLE_LABELS[session.role]}
          </span>
          <span aria-hidden>·</span>
          <span>{progressText}</span>
        </div>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          Exit session
        </Link>
      </header>

      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {card.modes.slice(0, 2).map((m) => (
            <ModeBadge key={m} mode={m} />
          ))}
        </div>
        <h1 className="text-lg font-bold sm:text-xl">{card.title}</h1>
        <p className="mt-2 text-base leading-relaxed">{card.prompt}</p>
        {runner.settings?.showHintsDuringInterview && card.answerStructureHint && (
          <div className="mt-3">
            {showHint ? (
              <p className="rounded-lg bg-background px-3 py-2 text-sm text-secondary">
                💡 {card.answerStructureHint}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setHintShownForIndex(runner.currentIndex)}
                className="text-sm font-medium text-accent hover:underline"
              >
                Show hint
              </button>
            )}
          </div>
        )}
      </Card>

      {runner.phase === "question" && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <CountdownTimer
              seconds={card.thinkingTimeSeconds}
              label="Thinking time"
              startedAt={runner.thinkingStartedAt}
            />
            <button type="button" onClick={runner.skipQuestion} className={buttonGhost}>
              Skip question
            </button>
          </div>
          <AnswerCapture
            expectedDurationSeconds={card.expectedDurationSeconds}
            speechModel={runner.settings?.preferredSpeechModel ?? "tiny"}
            speechEngine={runner.settings?.speechEngine ?? "whisper"}
            cloudProvider={runner.settings?.cloudProvider ?? "groq"}
            cloudApiKey={runner.settings?.cloudApiKey ?? ""}
            vocabularyHint={[
              card.title,
              ...card.expectedPoints.flatMap((p) => p.acceptedSignals),
            ]}
            submitLabel="Review answer"
            onSubmit={runner.submitAnswer}
            autoFocusHint="Think first, then answer out loud — aim for a structured answer with a trade-off."
          />
        </Card>
      )}

      {runner.phase === "reviewed" && question.review && (
        <>
          <Card className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">Answer review</h2>
              <ScoreBadge score={question.review.totalScore} />
            </div>
            <p className="mt-2 text-sm text-secondary">
              {question.review.feedbackSummary}
            </p>
            <div className="mt-3">
              <RubricChecklist
                items={card.expectedPoints}
                coveredIds={question.review.coveredRubricItemIds}
                weakIds={question.review.weakRubricItemIds}
                semanticIds={question.review.semanticUpgradedIds ?? []}
                onOverride={runner.overrideRubric}
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              Matching runs locally: exact keywords plus meaning-based
              similarity (≈). Correct anything it still got wrong.
            </p>
          </Card>
          {question.review.generatedPracticeItems.length > 0 && (
            <Card className="mb-4">
              <h3 className="text-sm font-bold">
                Added to your practice queue
              </h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-secondary">
                {question.review.generatedPracticeItems.map((p) => (
                  <li key={p.id}>{p.prompt}</li>
                ))}
              </ul>
            </Card>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {runner.markedUnknown ? (
              <span className="text-sm font-medium text-good-text">
                Added learning cards to your practice queue ✓
              </span>
            ) : (
              <button
                type="button"
                onClick={runner.markTopicsUnknown}
                className={buttonGhost}
              >
                I don&apos;t know this topic
              </button>
            )}
            <button
              type="button"
              onClick={runner.continueAfterReview}
              className={buttonPrimary}
            >
              {runner.currentFollowUp ? "Continue to follow-up" : "Next question"}
            </button>
          </div>
        </>
      )}

      {runner.phase === "followup" && runner.currentFollowUp && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Follow-up
          </p>
          <p className="mt-1 text-base font-medium leading-relaxed">
            {runner.currentFollowUp.prompt}
          </p>
          <div className="mt-4">
            {runner.followUpResult ? (
              <div>
                {runner.currentFollowUp.expectedPoints.length > 0 && (
                  <RubricChecklist
                    items={runner.currentFollowUp.expectedPoints}
                    coveredIds={runner.followUpResult.coveredRubricItemIds}
                    weakIds={[]}
                  />
                )}
                <p className="mt-2 rounded-lg bg-background px-3 py-2 text-sm text-secondary">
                  {runner.followUpResult.transcript}
                </p>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={runner.finishFollowUp}
                    className={buttonPrimary}
                  >
                    Next question
                  </button>
                </div>
              </div>
            ) : (
              <>
                <AnswerCapture
                  expectedDurationSeconds={90}
                  speechModel={runner.settings?.preferredSpeechModel ?? "tiny"}
                  speechEngine={runner.settings?.speechEngine ?? "whisper"}
                  cloudProvider={runner.settings?.cloudProvider ?? "groq"}
                  cloudApiKey={runner.settings?.cloudApiKey ?? ""}
                  vocabularyHint={runner.currentFollowUp.expectedPoints.flatMap(
                    (p) => p.acceptedSignals,
                  )}
                  submitLabel="Submit follow-up answer"
                  onSubmit={runner.submitFollowUpAnswer}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={runner.finishFollowUp}
                    className={buttonGhost}
                  >
                    Skip follow-up
                  </button>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-secondary">
          Loading session…
        </div>
      }
    >
      <SessionRunner />
    </Suspense>
  );
}
