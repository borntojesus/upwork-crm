/**
 * Leaky-bucket rate limiter: at most `rps` requests released per second,
 * evenly spaced. Single FIFO queue per instance (in-process only — fine for
 * a local CLI tool).
 */
export class RateLimiter {
  private readonly minIntervalMs: number;
  private nextAvailable = 0;

  constructor(rps: number) {
    if (rps <= 0) throw new Error(`rps must be > 0, got ${rps}`);
    this.minIntervalMs = 1000 / rps;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const earliest = Math.max(now, this.nextAvailable);
    this.nextAvailable = earliest + this.minIntervalMs;
    const wait = earliest - now;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
}
