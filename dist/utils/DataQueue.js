"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcurrentJobQueue = exports.AsyncQueue = void 0;
class AsyncQueue {
    constructor() {
        this.queue = [];
        this.isRunning = false;
    }
    push(job) {
        this.queue.push(job);
        if (!this.isRunning) {
            this.run();
        }
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            this.isRunning = true;
            while (this.queue.length > 0) {
                const job = this.queue.shift();
                if (job) {
                    yield job();
                }
            }
            this.isRunning = false;
        });
    }
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            while (this.queue.length > 0) {
                const job = this.queue.shift();
                if (job) {
                    yield job();
                }
            }
        });
    }
    get length() {
        return this.queue.length;
    }
    get isIdle() {
        return this.queue.length === 0;
    }
}
exports.AsyncQueue = AsyncQueue;
class ConcurrentJobQueue {
    constructor(concurrency, maxQueueSize = Infinity // optional
    ) {
        this.concurrency = concurrency;
        this.maxQueueSize = maxQueueSize;
        this.queue = [];
        this.running = 0;
    }
    /**
     * Adds a new job to the queue.
     * Rejects if the queue exceeds maxQueueSize.
     */
    enqueue(job) {
        return new Promise((resolve, reject) => {
            if (this.queue.length >= this.maxQueueSize) {
                reject(new Error("Queue is full. Try again later."));
                return;
            }
            const wrappedJob = () => __awaiter(this, void 0, void 0, function* () {
                try {
                    const result = yield job();
                    resolve(result);
                }
                catch (err) {
                    reject(err);
                }
                finally {
                    this.running--;
                    this.runNext();
                }
            });
            this.queue.push(wrappedJob);
            this.runNext();
        });
    }
    runNext() {
        while (this.running < this.concurrency && this.queue.length > 0) {
            const job = this.queue.shift();
            if (job) {
                this.running++;
                job();
            }
        }
    }
    /** Number of jobs currently running */
    get activeCount() {
        return this.running;
    }
    /** Number of jobs waiting in the queue */
    get pendingCount() {
        return this.queue.length;
    }
}
exports.ConcurrentJobQueue = ConcurrentJobQueue;
