type Job<T> = () => Promise<T>;

export class AsyncQueue {
  private queue: Job<any>[] = [];
  private isRunning = false;

  push(job: Job<any>) {
    this.queue.push(job);
    if (!this.isRunning) {
      this.run();
    }
  }

  private async run() {
    this.isRunning = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) {
        await job();
      }
    }
    this.isRunning = false;
  }

  async flush() {
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) {
        await job();
      }
    }
  }

  get length() {
    return this.queue.length;
  }

  get isIdle() {
    return this.queue.length === 0;
  }
}

export interface QueueOptions {
  concurrency: number;
  maxQueueSize?: number;
  retries?: number; // how many times to retry on failure
  retryDelay?: number; // delay between retries in ms
  shutdownTimeout?: number; // max ms to wait during shutdown
}

export class ConcurrentJobQueue {
  private queue: Job<any>[] = [];
  private running = 0;
  private shuttingDown = false;

  private readonly concurrency: number;
  private readonly maxQueueSize: number;
  private readonly retries: number;
  private readonly retryDelay: number;
  private readonly shutdownTimeout: number;

  constructor(options: QueueOptions) {
    this.concurrency = options.concurrency;
    this.maxQueueSize = options.maxQueueSize ?? Infinity;
    this.retries = options.retries ?? 0;
    this.retryDelay = options.retryDelay ?? 0;
    this.shutdownTimeout = options.shutdownTimeout ?? 30000; // default 30s
  }

  enqueue<T>(job: Job<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.shuttingDown) {
        reject(new Error("Queue is shutting down. No new jobs accepted."));
        return;
      }

      if (this.queue.length >= this.maxQueueSize) {
        reject(new Error("Queue is full. Try again later."));
        return;
      }

      const wrappedJob = async () => {
        try {
          const result = await this.executeWithRetry(job);
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.running--;
          this.runNext();
        }
      };

      this.queue.push(wrappedJob);
      this.runNext();
    });
  }

  private async executeWithRetry<T>(job: Job<T>): Promise<T> {
    let lastError: any;
    for (let i = 0; i <= this.retries; i++) {
      try {
        return await job();
      } catch (err) {
        lastError = err;
        if (i < this.retries) {
          await new Promise((res) => setTimeout(res, this.retryDelay));
        }
      }
    }
    throw lastError;
  }

  private runNext() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) {
        this.running++;
        job();
      }
    }
  }

  /** Number of jobs currently running */
  get activeCount(): number {
    return this.running;
  }

  /** Number of jobs waiting in the queue */
  get pendingCount(): number {
    return this.queue.length;
  }

  /** Graceful shutdown: wait for all running + queued jobs to finish, with timeout */
  async shutdown(): Promise<void> {
    this.shuttingDown = true;

    return new Promise<void>((resolve) => {
      const start = Date.now();

      const check = () => {
        const elapsed = Date.now() - start;

        if (this.running === 0 && this.queue.length === 0) {
          resolve();
        } else if (elapsed >= this.shutdownTimeout) {
          console.warn(
            `⚠️ Queue shutdown timeout reached (${this.shutdownTimeout}ms). Forcing exit.`
          );
          resolve();
        } else {
          setTimeout(check, 200); // check every 200ms
        }
      };

      check();
    });
  }
}
