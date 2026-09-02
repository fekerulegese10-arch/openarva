import { OpenArvaAgent } from './agent.js';
const agent = new OpenArvaAgent();
function getNextRunAt8AM() {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(8, 0, 0, 0);
    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
    }
    return nextRun;
}
function scheduleNextTask() {
    const nextRun = getNextRunAt8AM();
    const delay = nextRun.getTime() - Date.now();
    setTimeout(async () => {
        console.log('📅 [OpenArva Scheduler] Running daily autonomous task...');
        await agent.executeTask({
            domain: 'agriculture',
            instruction: 'Generate daily market summary and backup business logs.'
        });
        scheduleNextTask();
    }, delay);
}
// Daily Scheduled Task Example (Every day at 8:00 AM)
export function initScheduledTasks() {
    scheduleNextTask();
}
