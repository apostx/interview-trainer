/// <reference lib="webworker" />
import {
  pipeline,
  env,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";

env.allowLocalModels = false;

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

export type EmbeddingWorkerRequest =
  | { type: "load" }
  | { type: "embed"; id: number; texts: string[] };

export type EmbeddingWorkerResponse =
  | { type: "progress"; file: string; loaded: number; total: number; done: boolean }
  | { type: "ready" }
  | { type: "vectors"; id: number; vectors: number[][] }
  | { type: "error"; id?: number; message: string };

let extractor: FeatureExtractionPipeline | null = null;

function post(message: EmbeddingWorkerResponse) {
  self.postMessage(message);
}

async function load() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", MODEL_ID, {
      // Small model — WASM keeps it simple and it is fast enough on CPU.
      device: "wasm",
      dtype: "q8",
      progress_callback: (event: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (event.status === "progress" && event.file) {
          post({
            type: "progress",
            file: event.file,
            loaded: event.loaded ?? 0,
            total: event.total ?? 0,
            done: false,
          });
        }
      },
    });
  }
  post({ type: "ready" });
}

async function embed(id: number, texts: string[]) {
  if (!extractor) {
    post({ type: "error", id, message: "Embedding model is not loaded." });
    return;
  }
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  post({ type: "vectors", id, vectors: output.tolist() as number[][] });
}

self.addEventListener(
  "message",
  async (event: MessageEvent<EmbeddingWorkerRequest>) => {
    const request = event.data;
    try {
      if (request.type === "load") await load();
      else if (request.type === "embed") await embed(request.id, request.texts);
    } catch (error) {
      post({
        type: "error",
        id: request.type === "embed" ? request.id : undefined,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
