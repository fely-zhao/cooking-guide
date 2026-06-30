type TimerEntry = {
  timeoutId: ReturnType<typeof setTimeout>;
  startedAt: number;
  duration: number;
};

let nextId = 0;

export class TimerService {
  private timers = new Map<string, TimerEntry>();

  startTimer(durationSeconds: number, signal?: AbortSignal): Promise<string> {
    const timerId = `timer_${nextId++}`;
    const duration = durationSeconds * 1000;
    const startedAt = Date.now();

    return new Promise<string>(resolve => {
      const timeoutId = setTimeout(() => {
        this.timers.delete(timerId);
        resolve(timerId);
      }, duration);

      this.timers.set(timerId, { timeoutId, startedAt, duration });

      if (signal) {
        const onAbort = () => {
          clearTimeout(timeoutId);
          this.timers.delete(timerId);
        };
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  cancelTimer(timerId: string): boolean {
    const entry = this.timers.get(timerId);
    if (!entry) {
      return false;
    }
    clearTimeout(entry.timeoutId);
    this.timers.delete(timerId);
    return true;
  }

  cancelAll(): void {
    for (const [timerId, entry] of this.timers) {
      clearTimeout(entry.timeoutId);
      this.timers.delete(timerId);
    }
  }

  getRemaining(timerId: string): number | null {
    const entry = this.timers.get(timerId);
    if (!entry) {
      return null;
    }
    const elapsed = Date.now() - entry.startedAt;
    const remaining = entry.duration - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  dispose(): void {
    this.cancelAll();
  }
}
