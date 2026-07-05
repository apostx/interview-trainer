"use client";

import { create } from "zustand";
import type { SpeechModelSize } from "@/core/models";
import type {
  WorkerRequest,
  WorkerResponse,
} from "@/core/speech/whisper.worker";

type FileProgress = { loaded: number; total: number; done: boolean };

export type TranscriberStatus =
  | "idle"
  | "loading"
  | "ready"
  | "transcribing"
  | "error";

type TranscriberState = {
  status: TranscriberStatus;
  model: SpeechModelSize | null;
  /** Backend Whisper actually runs on; "wasm" (CPU) explains slowness. */
  device: "webgpu" | "wasm" | null;
  /** 0–1 overall download progress while loading. */
  loadProgress: number;
  error: string | null;
  load: (model: SpeechModelSize) => Promise<void>;
  transcribe: (audio: Float32Array) => Promise<string>;
};

let worker: Worker | null = null;
let loadPromise: Promise<void> | null = null;
const fileProgress = new Map<string, FileProgress>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("../core/speech/whisper.worker.ts", import.meta.url),
      { type: "module" },
    );
  }
  return worker;
}

function overallProgress(): number {
  let loaded = 0;
  let total = 0;
  for (const p of fileProgress.values()) {
    if (p.total > 0) {
      loaded += p.done ? p.total : p.loaded;
      total += p.total;
    }
  }
  return total > 0 ? loaded / total : 0;
}

export const useTranscriberStore = create<TranscriberState>((set, get) => ({
  status: "idle",
  model: null,
  device: null,
  loadProgress: 0,
  error: null,

  load: (model) => {
    const { status, model: loadedModel } = get();
    if (status === "ready" && loadedModel === model) return Promise.resolve();
    // A load (or a transcription on the previously loaded model) is running;
    // callers await whatever is in flight rather than racing the worker.
    if (loadPromise && (status === "loading" || status === "transcribing")) {
      return loadPromise;
    }

    fileProgress.clear();
    set({ status: "loading", model, loadProgress: 0, error: null });

    loadPromise = new Promise<void>((resolve, reject) => {
      const w = getWorker();
      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if (msg.type === "progress") {
          fileProgress.set(msg.file, {
            loaded: msg.loaded,
            total: msg.total,
            done: msg.done,
          });
          set({ loadProgress: overallProgress() });
        } else if (msg.type === "ready") {
          w.removeEventListener("message", onMessage);
          loadPromise = null;
          set({ status: "ready", loadProgress: 1, device: msg.device });
          resolve();
        } else if (msg.type === "error") {
          w.removeEventListener("message", onMessage);
          loadPromise = null;
          set({ status: "error", error: msg.message });
          reject(new Error(msg.message));
        }
      };
      w.addEventListener("message", onMessage);
      w.postMessage({ type: "load", model } satisfies WorkerRequest);
    });
    return loadPromise;
  },

  transcribe: (audio) => {
    if (get().status !== "ready") {
      return Promise.reject(new Error("Speech model is not loaded."));
    }
    set({ status: "transcribing" });

    return new Promise<string>((resolve, reject) => {
      const w = getWorker();
      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if (msg.type === "transcript") {
          w.removeEventListener("message", onMessage);
          set({ status: "ready" });
          resolve(msg.text);
        } else if (msg.type === "error") {
          w.removeEventListener("message", onMessage);
          set({ status: "error", error: msg.message });
          reject(new Error(msg.message));
        }
      };
      w.addEventListener("message", onMessage);
      w.postMessage({ type: "transcribe", audio } satisfies WorkerRequest);
    });
  },
}));
