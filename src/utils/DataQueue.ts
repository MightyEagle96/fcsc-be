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

export class ConcurrentJobQueue {
  private queue: Job<any>[] = [];
  private running = 0;

  constructor(
    private readonly concurrency: number,
    private readonly maxQueueSize: number = Infinity // optional
  ) {}

  /**
   * Adds a new job to the queue.
   * Rejects if the queue exceeds maxQueueSize.
   */
  enqueue<T>(job: Job<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.queue.length >= this.maxQueueSize) {
        reject(new Error("Queue is full. Try again later."));
        return;
      }

      const wrappedJob = async () => {
        try {
          const result = await job();
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
}
