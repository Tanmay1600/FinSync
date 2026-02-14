declare module 'vosk-browser' {
  export interface RecognizerMessage {
    result: {
      text?: string
      partial?: string
    }
  }

  export interface KaldiRecognizer {
    setWords(words: boolean): void
    on(event: 'result', callback: (message: RecognizerMessage) => void): void
    on(event: 'partialresult', callback: (message: RecognizerMessage) => void): void
    acceptWaveform(data: Float32Array | ArrayBuffer): void
    remove(): void
  }

  export interface Model {
    KaldiRecognizer: new (sampleRate: number) => KaldiRecognizer
    terminate(): void
  }

  export function createModel(path: string): Promise<Model>
}
