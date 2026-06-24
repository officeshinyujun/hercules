import { NextRequest } from 'next/server';
import { getJob, subscribeToJob, ProgressUpdate, Job } from '@/lib/job-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'Missing jobId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const job = getJob(jobId);
  if (!job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      // Send initial state
      sendEvent('progress', { stage: job.stage, progress: job.progress, message: job.message });

      const unsubscribe = subscribeToJob(
        jobId,
        (update: ProgressUpdate) => {
          sendEvent('progress', update);
        },
        (completedJob: Job) => {
          if (completedJob.status === 'completed') {
            sendEvent('complete', { result: completedJob.result });
          } else if (completedJob.status === 'error') {
            sendEvent('error', { error: completedJob.error });
          }
          try { controller.close(); } catch {}
        }
      );

      // Keep-alive ping every 15 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15000);

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        unsubscribe();
        try { controller.close(); } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
