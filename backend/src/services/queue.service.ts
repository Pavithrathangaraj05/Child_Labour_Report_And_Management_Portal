import { EventEmitter } from 'events';

export type QueueName =
  | 'notifications'
  | 'escalation-jobs'
  | 'ai-processing'
  | 'evidence-processing'
  | 'scheduled-followups';

export interface Job<T = any> {
  id: string;
  queue: QueueName;
  data: T;
  timestamp: Date;
  attempts: number;
}

type JobHandler<T = any> = (job: Job<T>) => Promise<any>;

class QueueManager extends EventEmitter {
  private handlers = new Map<QueueName, JobHandler>();
  private activeJobsCount = 0;
  private completedJobsCount = 0;

  constructor() {
    super();
    console.log('[QUEUE SERVICE] Asynchronous Background Job Manager Initialized.');
  }

  registerWorker<T = any>(queue: QueueName, handler: JobHandler<T>) {
    this.handlers.set(queue, handler);
  }

  async add<T = any>(queue: QueueName, data: T, options: { delayMs?: number } = {}): Promise<string> {
    const jobId = `${queue}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const job: Job<T> = {
      id: jobId,
      queue,
      data,
      timestamp: new Date(),
      attempts: 0,
    };

    const run = async () => {
      const handler = this.handlers.get(queue);
      if (!handler) {
        console.warn(`[QUEUE] No worker registered for queue: ${queue}`);
        return;
      }

      this.activeJobsCount++;
      try {
        job.attempts++;
        await handler(job);
        this.completedJobsCount++;
      } catch (err: any) {
        console.error(`[QUEUE JOB FAILED] Queue: ${queue}, Job: ${jobId}:`, err.message);
      } finally {
        this.activeJobsCount--;
      }
    };

    if (options.delayMs && options.delayMs > 0) {
      setTimeout(run, options.delayMs);
    } else {
      // Execute asynchronously on the next tick so the HTTP handler is NOT blocked
      setImmediate(run);
    }

    return jobId;
  }

  getStats() {
    return {
      activeJobs: this.activeJobsCount,
      completedJobs: this.completedJobsCount,
      queuesRegistered: Array.from(this.handlers.keys()),
    };
  }
}

export const queueManager = new QueueManager();
