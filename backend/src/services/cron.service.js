const { PrismaClient } = require('@prisma/client');
const { DateTime } = require('luxon');
const { sendWarningNotification, sendCriticalNotification } = require('./notification.service');
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM LOG HELPER
// ─────────────────────────────────────────────────────────────────────────────

const writeSystemLog = async (userId, level, message) => {
    try {
        await prisma.systemLog.create({ data: { userId, level, message } });
    } catch (e) {
        console.error('[SYSLOG_WRITE_ERROR]', e.message);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// WARNING DISPATCHER  – runs every minute, fires warnings ahead of deadline
// ─────────────────────────────────────────────────────────────────────────────

const dispatchWarnings = async () => {
    // Fetch all non-completed goals with their user's timezone
    const goals = await prisma.goal.findMany({
        where: { isCompleted: false },
        include: { user: { select: { id: true, timezone: true, expoPushToken: true } } }
    });

    for (const goal of goals) {
        const tz = goal.user.timezone || 'UTC';
        const userNow = DateTime.now().setZone(tz);
        const userNowStr = userNow.toFormat('HH:mm'); // e.g. "20:00"

        // Parse deadline in user's timezone
        const [dh, dm] = goal.checkInterval.split(':').map(Number);
        const deadline = userNow.set({ hour: dh, minute: dm, second: 0, millisecond: 0 });
        const minutesLeft = Math.round(deadline.diff(userNow, 'minutes').minutes);

        // Warning windows: warn once per threshold
        const warningThresholds = [120, 60, 30]; // 2h, 1h, 30m before deadline
        if (warningThresholds.includes(minutesLeft)) {
            const completedCount = goal.currentCount;
            const remaining = goal.targetCount - completedCount;
            if (remaining > 0) {
                const msg = `[WARNING] DEADLINE_APPROACHING: ${minutesLeft} min left. ${completedCount}/${goal.targetCount} ${goal.title} completed.`;
                console.log(msg);
                await writeSystemLog(goal.userId, 'WARNING', msg);
                if (goal.user.expoPushToken) {
                    await sendWarningNotification(goal.user.expoPushToken, minutesLeft, goal.title);
                }
            }
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DEATH WATCH  – precise per-user timezone check + 5-minute grace window
// ─────────────────────────────────────────────────────────────────────────────

const evaluateGoalConsequences = async () => {
    try {
        // Fetch non-completed goals including the user's timezone
        const goals = await prisma.goal.findMany({
            where: { isCompleted: false },
            include: {
                user: { select: { id: true, timezone: true, lastSyncedAt: true, expoPushToken: true } }
            }
        });

        for (const goal of goals) {
            const tz = goal.user.timezone || 'UTC';
            const userNow = DateTime.now().setZone(tz);

            // Parse the goal's checkInterval ("HH:MM") as a time today in user's tz
            const [dh, dm] = goal.checkInterval.split(':').map(Number);
            const deadlineToday = userNow.set({ hour: dh, minute: dm, second: 0, millisecond: 0 });

            // Minutes elapsed since the deadline (positive = past deadline)
            const minutesPast = Math.round(userNow.diff(deadlineToday, 'minutes').minutes);

            // Only fire in the window [0, +5] minutes past the deadline (grace period)
            // This prevents double-firing on subsequent minutes by checking lastSyncedAt
            if (minutesPast < 0 || minutesPast > 5) continue;

            // ── GRACE PERIOD CHECK ────────────────────────────────────────────
            // If the user's last sync happened within the 5-min window BEFORE the
            // deadline, the platform API may still be propagating. Give benefit of doubt.
            if (goal.lastSyncedAt) {
                const syncedAt = DateTime.fromJSDate(goal.lastSyncedAt).setZone(tz);
                const syncMinutesPastDeadline = Math.round(deadlineToday.diff(syncedAt, 'minutes').minutes);
                // Synced within 5 minutes BEFORE deadline — still within grace
                if (syncMinutesPastDeadline >= 0 && syncMinutesPastDeadline <= 5) {
                    const graceMsg = `[INFO] GRACE_PERIOD: Goal "${goal.title}" synced ${syncMinutesPastDeadline}m before deadline. Extending window.`;
                    console.log(graceMsg);
                    await writeSystemLog(goal.userId, 'INFO', graceMsg);
                    continue;
                }
            }

            // ── CONSEQUENCE ───────────────────────────────────────────────────
            // Avoid duplicate consequences for the same goal in the same minute
            const recentConsequence = await prisma.consequence.findFirst({
                where: {
                    goalId: goal.id,
                    issuedAt: { gte: deadlineToday.toJSDate() }
                }
            });
            if (recentConsequence) continue;

            await prisma.consequence.create({
                data: {
                    goalId: goal.id,
                    userId: goal.userId,
                    type: 'TERMINAL_FAILURE',
                    reason: `Failed to meet ${goal.targetCount} ${goal.title} by ${goal.checkInterval} (${tz}). Final count: ${goal.currentCount}.`
                }
            });

            await prisma.goal.update({
                where: { id: goal.id },
                data: { streak: 0 }
            });

            const failMsg = `[CRITICAL] STREAK_RESET: Goal "${goal.title}" (${goal.id}) failed for user ${goal.userId}. Consequence issued.`;
            console.error(failMsg);
            await writeSystemLog(goal.userId, 'CRITICAL', failMsg);
            if (goal.user.expoPushToken) {
                await sendCriticalNotification(goal.user.expoPushToken, goal.title);
            }
        }

    } catch (e) {
        console.error('[CRON_ERROR]', e.message);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULER  – align to the next whole minute, then tick every 60s
// ─────────────────────────────────────────────────────────────────────────────

const startCronJobs = () => {
    console.log('[CRON] DeathWatch + WarningDispatcher initialised.');

    const tick = () => {
        evaluateGoalConsequences();
        dispatchWarnings();
    };

    // Align start to the next whole clock minute so HH:MM comparisons are clean
    const msUntilNextMinute = (60 - new Date().getSeconds()) * 1000 - new Date().getMilliseconds();
    setTimeout(() => {
        tick(); // fire immediately on the minute boundary
        setInterval(tick, 60 * 1000);
    }, msUntilNextMinute);
};

module.exports = { startCronJobs, writeSystemLog };
