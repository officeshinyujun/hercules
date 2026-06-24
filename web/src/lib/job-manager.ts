export interface ProgressUpdate {
  stage: string;
  progress: number;
  message: string;
  status?: 'info' | 'success' | 'warning' | 'error';
  detail?: string;
}

interface Job {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  stage: string;
  message: string;
  result?: any;
  error?: string;
  listeners: Set<(update: ProgressUpdate) => void>;
  completedListeners: Set<(job: Job) => void>;
}

const jobs = new Map<string, Job>();

let counter = 0;

export function createJob(): string {
  const id = `job_${Date.now()}_${++counter}`;
  jobs.set(id, {
    id,
    status: 'pending',
    progress: 0,
    stage: 'pending',
    message: '작업이 생성되었습니다.',
    listeners: new Set(),
    completedListeners: new Set(),
  });
  return id;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJobProgress(jobId: string, update: ProgressUpdate) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.progress = update.progress;
  job.stage = update.stage;
  job.message = update.message;
  if (update.status) {
    // Map to job status
  }

  for (const listener of job.listeners) {
    try { listener(update); } catch {}
  }
}

export function completeJob(jobId: string, result: any) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'completed';
  job.progress = 100;
  job.result = result;

  for (const listener of job.completedListeners) {
    try { listener(job); } catch {}
  }
  // Cleanup listeners
  job.listeners.clear();
  job.completedListeners.clear();
}

export function failJob(jobId: string, error: string) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'error';
  job.error = error;

  for (const listener of job.completedListeners) {
    try { listener(job); } catch {}
  }
  job.listeners.clear();
  job.completedListeners.clear();
}

export function subscribeToJob(jobId: string, onProgress: (update: ProgressUpdate) => void, onComplete: (job: Job) => void) {
  const job = jobs.get(jobId);
  if (!job) {
    onComplete({ id: jobId, status: 'error', progress: 0, stage: 'error', message: 'Job not found', listeners: new Set(), completedListeners: new Set(), error: 'Job not found' });
    return () => {};
  }

  // If already completed/errored, fire immediately
  if (job.status === 'completed' || job.status === 'error') {
    onComplete(job);
    return () => {};
  }

  job.listeners.add(onProgress);
  job.completedListeners.add(onComplete);

  return () => {
    job.listeners.delete(onProgress);
    job.completedListeners.delete(onComplete);
  };
}

// Cleanup old jobs periodically (older than 30 minutes)
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of jobs) {
    const idTime = parseInt(id.split('_')[1], 10);
    if (idTime < cutoff) {
      jobs.delete(id);
    }
  }
}, 5 * 60 * 1000);

export type { Job };
