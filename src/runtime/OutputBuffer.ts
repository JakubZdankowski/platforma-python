import { MAX_OUTPUT_CHARS, type OutputStream } from './protocol';

/** Bounds both stored output and postMessage traffic during synchronous Python. */
export class OutputBuffer {
  private length = 0;
  private lastFlush = -Infinity;
  private stdout = '';
  private stderr = '';
  private truncated = false;

  constructor(
    private readonly emit: (stream: OutputStream, text: string) => void,
    private readonly onTruncated: () => void,
    private readonly now = () => performance.now(),
  ) {}

  append(stream: OutputStream, text: string): void {
    const accepted = text.slice(0, MAX_OUTPUT_CHARS - this.length);
    this.length += accepted.length;
    this[stream] += accepted;
    if (accepted.length < text.length && !this.truncated) {
      this.truncated = true;
      this.flush();
      this.onTruncated();
    }
    if (this.now() - this.lastFlush >= 40) this.flush();
  }

  flush(): void {
    for (const stream of ['stdout', 'stderr'] as const) {
      if (this[stream]) this.emit(stream, this[stream]);
      this[stream] = '';
    }
    this.lastFlush = this.now();
  }
}
