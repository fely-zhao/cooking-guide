/**
 * STT-specific error wrapper.
 */
export class STTError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'STTError';
    this.cause = cause;
  }
}
