/// <reference lib="webworker" />
import {
  pipeline,
  env,
  type AutomaticSpeechRecognitionPipeline,
} from "@huggingface/transformers";
import { cleanTranscript, fixDomainTerms } from "./audioUtils";

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

export type WhisperDevice = "webgpu" | "wasm";

export type WorkerResponse =
  | {
      type: "progress";
      file: string;
      loaded: number;
      total: number;
      done: boolean;
    }
  | { type: "ready"; model: WhisperModelSize; device: WhisperDevice }
  | { type: "transcript"; text: string }
  | { type: "error"; message: string };

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let loadedModel: WhisperModelSize | null = null;
let loadedDevice: WhisperDevice = "wasm";

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
    post({ type: "ready", model, device: loadedDevice });
    return;
  }
  transcriber = null;
  loadedModel = null;

  const modelId = MODEL_IDS[model];
  const webgpu = await hasWebGPU();
  try {
    if (!webgpu) throw new Error("no WebGPU adapter");
    transcriber = await pipeline("automatic-speech-recognition", modelId, {
      device: "webgpu",
      // fp32 encoder for accuracy; quantized decoder — the decoder dominates
      // generation time, so this is the difference between slow and snappy.
      dtype: { encoder_model: "fp32", decoder_model_merged: "q4" },
      progress_callback: progressCallback,
    });
    loadedDevice = "webgpu";
  } catch {
    // WebGPU missing or driver init failed — fall back to CPU (WASM).
    transcriber = await pipeline("automatic-speech-recognition", modelId, {
      device: "wasm",
      dtype: "q8",
      progress_callback: progressCallback,
    });
    loadedDevice = "wasm";
  }
  loadedModel = model;
  post({ type: "ready", model, device: loadedDevice });
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
  post({ type: "transcript", text: fixDomainTerms(cleanTranscript(text)) });
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
