/// <reference lib="webworker" />
import {
  pipeline,
  env,
  type AutomaticSpeechRecognitionPipeline,
} from "@huggingface/transformers";
import { cleanTranscript } from "./audioUtils";

// Models are fetched from the Hugging Face Hub and cached by the browser.
env.allowLocalModels = false;

const MODEL_IDS = {
  tiny: "onnx-community/whisper-tiny.en",
  base: "onnx-community/whisper-base.en",
  small: "onnx-community/whisper-small.en",
} as const;

export type WhisperModelSize = keyof typeof MODEL_IDS;

export type WorkerRequest =
  | { type: "load"; model: WhisperModelSize }
  | { type: "transcribe"; audio: Float32Array };

export type WorkerResponse =
  | {
      type: "progress";
      file: string;
      loaded: number;
      total: number;
      done: boolean;
    }
  | { type: "ready"; model: WhisperModelSize }
  | { type: "transcript"; text: string }
  | { type: "error"; message: string };

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let loadedModel: WhisperModelSize | null = null;

function post(message: WorkerResponse) {
  self.postMessage(message);
}

async function hasWebGPU(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return (await gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}

type ProgressEvent = {
  status: string;
  file?: string;
  loaded?: number;
  total?: number;
};

function progressCallback(event: ProgressEvent) {
  if (event.status === "progress" && event.file) {
    post({
      type: "progress",
      file: event.file,
      loaded: event.loaded ?? 0,
      total: event.total ?? 0,
      done: false,
    });
  } else if (event.status === "done" && event.file) {
    post({ type: "progress", file: event.file, loaded: 1, total: 1, done: true });
  }
}

async function load(model: WhisperModelSize) {
  if (loadedModel === model && transcriber) {
    post({ type: "ready", model });
    return;
  }
  transcriber = null;
  loadedModel = null;

  const modelId = MODEL_IDS[model];
  const webgpu = await hasWebGPU();
  try {
    transcriber = await pipeline("automatic-speech-recognition", modelId, {
      device: webgpu ? "webgpu" : "wasm",
      dtype: webgpu ? "fp32" : "q8",
      progress_callback: progressCallback,
    });
  } catch {
    // WebGPU init can fail on some drivers — retry on WASM before giving up.
    transcriber = await pipeline("automatic-speech-recognition", modelId, {
      device: "wasm",
      dtype: "q8",
      progress_callback: progressCallback,
    });
  }
  loadedModel = model;
  post({ type: "ready", model });
}

async function transcribe(audio: Float32Array) {
  if (!transcriber) {
    post({ type: "error", message: "Model is not loaded yet." });
    return;
  }
  const output = await transcriber(audio, {
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  const text = Array.isArray(output)
    ? output.map((o) => o.text).join(" ")
    : output.text;
  // Collapse Whisper's silence hallucinations ("you you you…") to "" so the
  // UI can tell the user nothing was heard instead of showing garbage.
  post({ type: "transcript", text: cleanTranscript(text) });
}

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === "load") await load(request.model);
    else if (request.type === "transcribe") await transcribe(request.audio);
  } catch (error) {
    post({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
