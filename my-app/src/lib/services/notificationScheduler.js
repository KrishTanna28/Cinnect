/**
 * Notification Scheduler
 *
 * Runs periodic background jobs to generate entertainment notifications.
 * Uses randomized intervals to make notifications feel natural.
 *
 * Because server.js runs outside Next.js module resolution, this scheduler
 * invokes the generation logic via the internal API route so that @/ aliases
 * and DB connections work correctly through the Next.js pipeline.
 */

let schedulerRunning = false;
let serverPort = 3000;

/**
 * Start the notification scheduler.
 * @param {number} port - The port the server is listening on.
 */
export function startNotificationScheduler(port = 3000) {
  if (schedulerRunning) return;
  schedulerRunning = true;
  serverPort = port;
  console.log('[Scheduler] Entertainment notification scheduler started');
  // Initial delay: wait 60–120s for the server to fully warm up
  const initialDelay = 60000 + Math.floor(Math.random() * 60000);
  setTimeout(runGeneration, initialDelay);
}

async function runGeneration() {
  try {
    // Call the background generation endpoint
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/notifications/generate-all`, {
      method: 'POST',
      headers: { 'x-scheduler-secret': process.env.SCHEDULER_SECRET || 'internal-scheduler' }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`[Scheduler] Generation complete: ${data.processed || 0} users processed`);
    } else {
      console.error('[Scheduler] Generation endpoint returned', res.status);
    }
  } catch (err) {
    console.error('[Scheduler] Notification generation failed:', err.message);
  }
  scheduleNext();
}

function scheduleNext() {
  // Random interval between 30 and 90 minutes
  const minMs = 30 * 60 * 1000;
  const maxMs = 90 * 60 * 1000;
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  const mins = Math.round(delay / 60000);
  console.log(`[Scheduler] Next notification generation in ~${mins} minutes`);
  setTimeout(runGeneration, delay);
}

