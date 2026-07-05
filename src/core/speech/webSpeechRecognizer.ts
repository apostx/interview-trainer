/**
 * Wrapper around the browser's SpeechRecognition (Google's servers in
 * Chrome/Edge): live interim transcripts while speaking, near-instant final
 * text. Not local-first — the app offers it as an opt-in engine and falls
 * back to local Whisper when it is unavailable or errors.
 */
export class WebSpeechRecognizer {
  private recognition: WebSpeechRecognition | null = null;
  private finalText = "";
  private interimText = "";
  private stopping = false;
  private failure: string | null = null;
  private onUpdate: ((text: string) => void) | null = null;

  static isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition ?? window.webkitSpeechRecognition)
    );
  }

  get error(): string | null {
    return this.failure;
  }

  get text(): string {
    return `${this.finalText} ${this.interimText}`.replace(/\s+/g, " ").trim();
  }

  start(onUpdate: (text: string) => void): void {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) throw new Error("SpeechRecognition is not supported here.");

    this.onUpdate = onUpdate;
    this.finalText = "";
    this.interimText = "";
    this.stopping = false;
    this.failure = null;

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          this.finalText = `${this.finalText} ${result[0].transcript}`.trim();
        } else {
          interim += result[0].transcript;
        }
      }
      this.interimText = interim.trim();
      this.onUpdate?.(this.text);
    };

    recognition.onerror = (event) => {
      // "no-speech" just means a quiet stretch; the restart loop handles it.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        this.failure = event.error;
      }
    };

    recognition.onend = () => {
      // Chrome auto-stops after silence or ~60s; keep listening until the
      // user actually presses stop, unless a real error occurred.
      if (!this.stopping && !this.failure) {
        try {
          recognition.start();
        } catch {
          /* already restarted */
        }
      }
    };

    this.recognition = recognition;
    recognition.start();
  }

  /** Stops listening and resolves with everything heard so far. */
  stop(): Promise<string> {
    this.stopping = true;
    const recognition = this.recognition;
    if (!recognition) return Promise.resolve(this.text);

    return new Promise((resolve) => {
      const finish = () => resolve(this.text);
      const timeout = setTimeout(finish, 2000);
      recognition.onend = () => {
        clearTimeout(timeout);
        finish();
      };
      try {
        recognition.stop();
      } catch {
        clearTimeout(timeout);
        finish();
      }
    });
  }

  cancel(): void {
    this.stopping = true;
    try {
      this.recognition?.abort();
    } catch {
      /* noop */
    }
    this.recognition = null;
  }
}
