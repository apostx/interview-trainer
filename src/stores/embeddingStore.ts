"use client";

import { create } from "zustand";
import type {
  EmbeddingWorkerRequest,
  EmbeddingWorkerResponse,
} from "@/core/semantic/embedding.worker";

export type EmbeddingStatus = "idle" | "loading" | "ready" | "error";

type EmbeddingState = {
  status: EmbeddingStatus;
  error: string | null;
  load: () => Promise<void>;
  /** Embeds texts to normalized vectors; rejects if the model is unusable. */
  embed: (texts: string[]) => Promise<number[][]>;
};

let worker: Worker | null = null;
let loadPromise: Promise<void> | null = null;
let requestId = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("../core/semantic/embedding.worker.ts", import.meta.url),
      { type: "module" },
    );
  }
  return worker;
}

export const useEmbeddingStore = create<EmbeddingState>((set, get) => ({
  status: "idle",
  error: null,

  load: () => {
    if (get().status === "ready") return Promise.resolve();
    if (loadPromise) return loadPromise;

    set({ status: "loading", error: null });
    loadPromise = new Promise<void>((resolve, reject) => {
      const w = getWorker();
      const onMessage = (event: MessageEvent<EmbeddingWorkerResponse>) => {
        const msg = event.data;
        if (msg.type === "ready") {
          w.removeEventListener("message", onMessage);
          loadPromise = null;
          set({ status: "ready" });
          resolve();
        } else if (msg.type === "error" && msg.id === undefined) {
          w.removeEventListener("message", onMessage);
          loadPromise = null;
          set({ status: "error", error: msg.message });
          reject(new Error(msg.message));
        }
      };
      w.addEventListener("message", onMessage);
      w.postMessage({ type: "load" } satisfies EmbeddingWorkerRequest);
    });
    return loadPromise;
  },

  embed: async (texts) => {
    await get().load();
    const id = ++requestId;
    return new Promise<number[][]>((resolve, reject) => {
      const w = getWorker();
      const onMessage = (event: MessageEvent<EmbeddingWorkerResponse>) => {
        const msg = event.data;
        if (msg.type === "vectors" && msg.id === id) {
          w.removeEventListener("message", onMessage);
          resolve(msg.vectors);
        } else if (msg.type === "error" && msg.id === id) {
          w.removeEventListener("message", onMessage);
          reject(new Error(msg.message));
        }
      };
      w.addEventListener("message", onMessage);
      w.postMessage({ type: "embed", id, texts } satisfies EmbeddingWorkerRequest);
    });
  },
}));
