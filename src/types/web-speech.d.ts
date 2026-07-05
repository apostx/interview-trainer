// Minimal typings for the Web Speech API (SpeechRecognition), which is not
// in TypeScript's DOM lib. Chrome exposes it as webkitSpeechRecognition.
interface WebSpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface WebSpeechRecognitionResult {
  isFinal: boolean;
  readonly length: number;
  [index: number]: WebSpeechRecognitionAlternative;
}

interface WebSpeechRecognitionResultList {
  readonly length: number;
  [index: number]: WebSpeechRecognitionResult;
}

interface WebSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: WebSpeechRecognitionResultList;
}

interface WebSpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface WebSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface Window {
  SpeechRecognition?: new () => WebSpeechRecognition;
  webkitSpeechRecognition?: new () => WebSpeechRecognition;
}
