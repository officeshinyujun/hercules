export interface ProgressUpdate {
  stage: string;
  progress: number;
  message: string;
  status?: 'info' | 'success' | 'warning' | 'error';
  detail?: string;
}

export type ProgressCallback = (update: ProgressUpdate) => void | Promise<void>;
