export const WHISPER_SAMPLE_RATE = 16000;

/**
 * Microphone recording via MediaRecorder. Audio never leaves the browser:
 * the blob is decoded locally and handed to the transcription worker.
 * An AnalyserNode taps the stream so the UI can show a live input level —
 * the fastest way to spot "the browser is listening to the wrong mic".
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private levelBuffer: Uint8Array<ArrayBuffer> | null = null;

  get isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  /** Label of the input device actually being recorded, e.g. "Headset Mic". */
  get deviceLabel(): string {
    return this.stream?.getAudioTracks()[0]?.label ?? "";
  }

  /** Current input level 0–1, for a live meter while recording. */
  getLevel(): number {
    if (!this.analyser || !this.levelBuffer) return 0;
    this.analyser.getByteTimeDomainData(this.levelBuffer);
    let max = 0;
    for (let i = 0; i < this.levelBuffer.length; i++) {
      const v = Math.abs(this.levelBuffer[i] - 128) / 128;
      if (v > max) max = v;
    }
    return max;
  }

  async start(): Promise<void> {
    if (this.isRecording) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    this.chunks = [];

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.levelBuffer = new Uint8Array(this.analyser.fftSize);
    source.connect(this.analyser);

    this.mediaRecorder = new MediaRecorder(this.stream);
    this.mediaRecorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    });
    this.mediaRecorder.start();
  }

  async stop(): Promise<Blob> {
    const recorder = this.mediaRecorder;
    if (!recorder || recorder.state === "inactive") {
      this.cleanup();
      return new Blob(this.chunks);
    }
    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
    });
    recorder.stop();
    await stopped;
    const blob = new Blob(this.chunks, { type: recorder.mimeType });
    this.cleanup();
    return blob;
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.cleanup();
    this.chunks = [];
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.audioContext?.close().catch(() => {});
    this.audioContext = null;
    this.analyser = null;
    this.levelBuffer = null;
    this.stream = null;
    this.mediaRecorder = null;
  }
}

/**
 * Decodes a recorded blob to mono 16 kHz PCM, the input format Whisper
 * expects.
 */
export async function blobToPCM(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: WHISPER_SAMPLE_RATE });
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer);
    if (decoded.numberOfChannels === 1) {
      return decoded.getChannelData(0);
    }
    // Mix down to mono.
    const left = decoded.getChannelData(0);
    const right = decoded.getChannelData(1);
    const mono = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      mono[i] = (left[i] + right[i]) / 2;
    }
    return mono;
  } finally {
    await audioContext.close();
  }
}
