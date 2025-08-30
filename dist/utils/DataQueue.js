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
    constructor(options) {
        var _a, _b, _c, _d;
        this.queue = [];
        this.running = 0;
        this.shuttingDown = false;
        this.concurrency = options.concurrency;
        this.maxQueueSize = (_a = options.maxQueueSize) !== null && _a !== void 0 ? _a : Infinity;
        this.retries = (_b = options.retries) !== null && _b !== void 0 ? _b : 0;
        this.retryDelay = (_c = options.retryDelay) !== null && _c !== void 0 ? _c : 0;
        this.shutdownTimeout = (_d = options.shutdownTimeout) !== null && _d !== void 0 ? _d : 30000; // default 30s
    }
    enqueue(job) {
        return new Promise((resolve, reject) => {
            if (this.shuttingDown) {
                reject(new Error("Queue is shutting down. No new jobs accepted."));
                return;
            }
            if (this.queue.length >= this.maxQueueSize) {
                reject(new Error("Queue is full. Try again later."));
                return;
            }
            const wrappedJob = () => __awaiter(this, void 0, void 0, function* () {
                try {
                    const result = yield this.executeWithRetry(job);
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
    executeWithRetry(job) {
        return __awaiter(this, void 0, void 0, function* () {
            let lastError;
            for (let i = 0; i <= this.retries; i++) {
                try {
                    return yield job();
                }
                catch (err) {
                    lastError = err;
                    if (i < this.retries) {
                        yield new Promise((res) => setTimeout(res, this.retryDelay));
                    }
                }
            }
            throw lastError;
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
    /** Graceful shutdown: wait for all running + queued jobs to finish, with timeout */
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            this.shuttingDown = true;
            return new Promise((resolve) => {
                const start = Date.now();
                const check = () => {
                    const elapsed = Date.now() - start;
                    if (this.running === 0 && this.queue.length === 0) {
                        resolve();
                    }
                    else if (elapsed >= this.shutdownTimeout) {
                        console.warn(`⚠️ Queue shutdown timeout reached (${this.shutdownTimeout}ms). Forcing exit.`);
                        resolve();
                    }
                    else {
                        setTimeout(check, 200); // check every 200ms
                    }
                };
                check();
            });
        });
    }
}
exports.ConcurrentJobQueue = ConcurrentJobQueue;
