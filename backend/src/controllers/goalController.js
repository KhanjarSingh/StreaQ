const prisma = require('../config/db');
const { writeSystemLog } = require('../services/cron.service');
const { DateTime } = require('luxon');

const IST_TIMEZONE = 'Asia/Kolkata';
const PROTOCOL_TYPES = ['GITHUB', 'LEETCODE', 'CODEFORCES', 'MANUAL'];
const REMINDER_FREQUENCIES = ['FIFTEEN_MINUTES', 'THIRTY_MINUTES', 'ONE_HOUR'];
const PUNISHMENT_LEVELS = ['STRICT', 'HARSH', 'RELENTLESS'];

const REMINDER_TO_MINUTES = {
    FIFTEEN_MINUTES: 15,
    THIRTY_MINUTES: 30,
    ONE_HOUR: 60,
};

const PROTOCOL_DEFAULTS = {
    GITHUB: {
        protocolType: 'GITHUB',
        type: 'AUTOMATED',
        sourcePlatform: 'GITHUB',
        title: 'GitHub Protocol',
        targetValue: 1,
        dailyDeadline: '22:30',
        reminderFrequency: 'THIRTY_MINUTES',
        punishmentLevel: 'STRICT',
    },
    LEETCODE: {
        protocolType: 'LEETCODE',
        type: 'AUTOMATED',
        sourcePlatform: 'LEETCODE',
        title: 'LeetCode Protocol',
        targetValue: 1,
        dailyDeadline: '22:30',
        reminderFrequency: 'THIRTY_MINUTES',
        punishmentLevel: 'STRICT',
    },
    CODEFORCES: {
        protocolType: 'CODEFORCES',
        type: 'AUTOMATED',
        sourcePlatform: 'CODEFORCES',
        title: 'Codeforces Protocol',
        targetValue: 1,
        dailyDeadline: '22:30',
        reminderFrequency: 'THIRTY_MINUTES',
        punishmentLevel: 'STRICT',
    },
    MANUAL: {
        protocolType: 'MANUAL',
        type: 'MANUAL',
        sourcePlatform: 'CUSTOM',
        title: 'Manual Protocol',
        targetValue: 1,
        dailyDeadline: '22:30',
        reminderFrequency: 'THIRTY_MINUTES',
        punishmentLevel: 'STRICT',
    },
};

const formatReminderLabel = (value) => {
    switch (value) {
        case 'FIFTEEN_MINUTES':
            return '15m';
        case 'THIRTY_MINUTES':
            return '30m';
        case 'ONE_HOUR':
            return '1h';
        default:
            return '30m';
    }
};

const isValidTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

const buildWarningSchedule = (reminderFrequency) => {
    const minutes = REMINDER_TO_MINUTES[reminderFrequency] || 30;
    return [minutes];
};

const normalizeOptionalString = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const normalizeProtocolInput = (body = {}, fallbackProtocolType) => {
    const protocolType = body.protocolType || fallbackProtocolType;

    if (!PROTOCOL_TYPES.includes(protocolType)) {
        return { error: 'protocolType must be GITHUB, LEETCODE, CODEFORCES, or MANUAL' };
    }

    const targetValue = Number(body.targetValue);
    if (!Number.isInteger(targetValue) || targetValue <= 0) {
        return { error: 'targetValue must be a positive integer' };
    }

    if (!isValidTime(body.dailyDeadline)) {
        return { error: 'dailyDeadline must be in HH:MM format' };
    }

    if (!REMINDER_FREQUENCIES.includes(body.reminderFrequency)) {
        return { error: 'reminderFrequency must be FIFTEEN_MINUTES, THIRTY_MINUTES, or ONE_HOUR' };
    }

    if (!PUNISHMENT_LEVELS.includes(body.punishmentLevel)) {
        return { error: 'punishmentLevel must be STRICT, HARSH, or RELENTLESS' };
    }

    const platformUsername = normalizeOptionalString(body.platformUsername);
    const manualTaskName = normalizeOptionalString(body.manualTaskName);
    const manualTaskDetails = normalizeOptionalString(body.manualTaskDetails);

    if ((protocolType === 'LEETCODE' || protocolType === 'CODEFORCES') && !platformUsername) {
        return { error: 'platformUsername is required for LeetCode and Codeforces protocols' };
    }

    if (protocolType === 'MANUAL' && !manualTaskName) {
        return { error: 'manualTaskName is required for manual protocols' };
    }

    return {
        protocolType,
        targetValue,
        dailyDeadline: body.dailyDeadline,
        reminderFrequency: body.reminderFrequency,
        punishmentLevel: body.punishmentLevel,
        platformUsername,
        manualTaskName,
        manualTaskDetails,
    };
};

const buildProtocolPayload = (input, existingGoal) => {
    const defaults = PROTOCOL_DEFAULTS[input.protocolType];
    const baseCount = existingGoal?.currentCount ?? 0;
    const normalizedCount = Math.min(baseCount, input.targetValue);
    const title = input.protocolType === 'MANUAL'
        ? input.manualTaskName
        : defaults.title;

    return {
        title,
        type: defaults.type,
        protocolType: input.protocolType,
        sourcePlatform: defaults.sourcePlatform,
        platformUsername: input.platformUsername,
        manualTaskName: input.manualTaskName,
        manualTaskDetails: input.manualTaskDetails,
        isActive: true,
        requiresConfiguration: false,
        targetValue: input.targetValue,
        dailyDeadline: input.dailyDeadline,
        reminderFrequency: input.reminderFrequency,
        punishmentLevel: input.punishmentLevel,
        checkInterval: input.dailyDeadline,
        targetCount: input.targetValue,
        currentCount: normalizedCount,
        isCompleted: normalizedCount >= input.targetValue,
        warningSchedule: buildWarningSchedule(input.reminderFrequency),
        lastSyncedAt: new Date(),
    };
};

const getDeadlineDateTime = (hhmm) => {
    const [hour = 22, minute = 30] = (hhmm || '22:30').split(':').map(Number);
    const now = DateTime.now().setZone(IST_TIMEZONE);
    let target = now.set({ hour, minute, second: 0, millisecond: 0 });
    if (target <= now) target = target.plus({ days: 1 });
    return target;
};

const getSecondsUntil = (hhmm) => Math.max(
    0,
    Math.floor(getDeadlineDateTime(hhmm).diff(DateTime.now().setZone(IST_TIMEZONE), 'seconds').seconds)
);

const getNextReminderTime = (goal) => {
    const minutes = REMINDER_TO_MINUTES[goal.reminderFrequency] || 30;
    return getDeadlineDateTime(goal.dailyDeadline || goal.checkInterval)
        .minus({ minutes })
        .toFormat('HH:mm');
};

const serializeGoal = (goal) => {
    const secondsRemaining = getSecondsUntil(goal.dailyDeadline || goal.checkInterval);
    const deadline = getDeadlineDateTime(goal.dailyDeadline || goal.checkInterval);
    const protocolDisplayName = goal.protocolType === 'MANUAL'
        ? `PROTOCOL_MANUAL: ${(goal.manualTaskName || goal.title || 'CUSTOM_TASK').toUpperCase().replace(/\s+/g, '_')}`
        : `PROTOCOL_${goal.protocolType}`;

    return {
        ...goal,
        timezone: IST_TIMEZONE,
        protocolDisplayName,
        displayTitle: goal.protocolType === 'MANUAL' ? (goal.manualTaskName || goal.title) : goal.title,
        nextReminderAt: getNextReminderTime(goal),
        reminderLabel: formatReminderLabel(goal.reminderFrequency),
        secondsRemaining,
        deadlineAtIst: deadline.toISO(),
    };
};

const getGoals = async (req, res) => {
    try {
        const [user, goals] = await Promise.all([
            prisma.user.findUnique({
                where: { id: req.user.id },
                select: { timezone: true, githubProfile: { select: { id: true, login: true } } },
            }),
            prisma.goal.findMany({
                where: { userId: req.user.id },
                orderBy: [
                    { isActive: 'desc' },
                    { createdAt: 'asc' },
                ],
            }),
        ]);

        const serializedGoals = goals.map(serializeGoal);
        const activeGoals = serializedGoals.filter((goal) => goal.isActive);
        const protocolState = PROTOCOL_TYPES.map((protocolType) => {
            const goal = serializedGoals.find((item) => item.protocolType === protocolType);
            return {
                protocolType,
                goalId: goal?.id || null,
                isActive: goal?.isActive || false,
                requiresConfiguration: goal?.requiresConfiguration || false,
                title: goal?.title || PROTOCOL_DEFAULTS[protocolType].title,
            };
        });

        return res.json({
            goals: serializedGoals,
            activeGoals,
            protocolState,
            timezone: IST_TIMEZONE,
            githubConnected: Boolean(user?.githubProfile?.id),
        });
    } catch (error) {
        console.error('Fetch goals error', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const activateProtocol = async (req, res) => {
    const normalized = normalizeProtocolInput(req.body);
    if (normalized.error) {
        return res.status(400).json({ message: normalized.error });
    }

    try {
        const existingGoal = await prisma.goal.findFirst({
            where: {
                userId: req.user.id,
                protocolType: normalized.protocolType,
            },
        });

        const payload = buildProtocolPayload(normalized, existingGoal);
        const goal = existingGoal
            ? await prisma.goal.update({
                where: { id: existingGoal.id },
                data: payload,
            })
            : await prisma.goal.create({
                data: {
                    userId: req.user.id,
                    ...payload,
                },
            });

        await writeSystemLog(
            req.user.id,
            'INFO',
            `[INFO] PROTOCOL_ACTIVATED: ${normalized.protocolType} configured for ${normalized.targetValue} target(s) by ${normalized.dailyDeadline}.`
        );

        return res.status(existingGoal ? 200 : 201).json({ goal: serializeGoal(goal) });
    } catch (error) {
        console.error('Activate protocol error', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const updateProtocolConfig = async (req, res) => {
    const { goalId } = req.params;

    try {
        const existingGoal = await prisma.goal.findFirst({
            where: {
                id: goalId,
                userId: req.user.id,
            },
        });

        if (!existingGoal) {
            return res.status(404).json({ message: 'Protocol not found' });
        }

        const normalized = normalizeProtocolInput(req.body, existingGoal.protocolType);
        if (normalized.error) {
            return res.status(400).json({ message: normalized.error });
        }

        const updatedGoal = await prisma.goal.update({
            where: { id: existingGoal.id },
            data: buildProtocolPayload(normalized, existingGoal),
        });

        await writeSystemLog(
            req.user.id,
            'INFO',
            `[INFO] PROTOCOL_UPDATED: ${updatedGoal.protocolType} updated to ${updatedGoal.targetValue} target(s) with ${updatedGoal.reminderFrequency}.`
        );

        return res.json({ goal: serializeGoal(updatedGoal) });
    } catch (error) {
        console.error('Update protocol error', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const toggleProtocol = async (req, res) => {
    const { goalId } = req.params;
    const { isActive } = req.body || {};

    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive boolean required' });
    }

    try {
        const goal = await prisma.goal.findFirst({
            where: {
                id: goalId,
                userId: req.user.id,
            },
        });

        if (!goal) {
            return res.status(404).json({ message: 'Protocol not found' });
        }

        const updatedGoal = await prisma.goal.update({
            where: { id: goal.id },
            data: {
                isActive,
                lastSyncedAt: new Date(),
            },
        });

        await writeSystemLog(
            req.user.id,
            'INFO',
            `[INFO] PROTOCOL_${isActive ? 'ENABLED' : 'DISABLED'}: ${goal.protocolType} protocol ${isActive ? 'activated' : 'paused'}.`
        );

        return res.json({ goal: serializeGoal(updatedGoal) });
    } catch (error) {
        console.error('Toggle protocol error', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const verifyManualGoal = async (req, res) => {
    const { goalId } = req.params;
    const { note, link } = req.body || {};

    try {
        const goal = await prisma.goal.findFirst({
            where: {
                id: goalId,
                userId: req.user.id,
                type: 'MANUAL',
            },
        });

        if (!goal) {
            return res.status(404).json({ message: 'Manual protocol not found' });
        }

        const manualName = (goal.manualTaskName || goal.title || '').toLowerCase();
        const requiresGymEvidence = manualName.includes('gym');
        if (requiresGymEvidence && !link?.trim()) {
            return res.status(400).json({ message: 'Gym protocols require an evidence photo before verification.' });
        }

        const verifiedGoal = await prisma.goal.update({
            where: { id: goal.id },
            data: {
                currentCount: goal.targetValue || goal.targetCount,
                isCompleted: true,
                lastSyncedAt: new Date(),
            },
        });

        const evidenceBits = [note?.trim(), link?.trim()].filter(Boolean);
        const evidenceSuffix = evidenceBits.length > 0 ? ` Evidence: ${evidenceBits.join(' | ')}` : '';

        await writeSystemLog(
            req.user.id,
            'SUCCESS',
            `[SUCCESS] MANUAL_PROTOCOL_VERIFIED: "${goal.title}" completed.${evidenceSuffix}`
        );

        return res.json({ goal: serializeGoal(verifiedGoal) });
    } catch (error) {
        console.error('Verify manual goal error', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const simulateGoalFailure = async (req, res) => {
    const { goalId } = req.params;

    try {
        const goal = await prisma.goal.findFirst({
            where: {
                id: goalId,
                userId: req.user.id,
            },
        });

        if (!goal) {
            return res.status(404).json({ message: 'Protocol not found' });
        }

        const failedGoal = await prisma.goal.update({
            where: { id: goal.id },
            data: {
                currentCount: 0,
                isCompleted: false,
                lastSyncedAt: new Date(),
            },
        });

        await prisma.consequence.create({
            data: {
                goalId: goal.id,
                userId: req.user.id,
                type: 'TERMINAL_FAILURE',
                reason: `Simulated failure for "${goal.title}" from the operator HUD.`,
            },
        });

        await writeSystemLog(
            req.user.id,
            'CRITICAL',
            `[CRITICAL] PROTOCOL_FAILURE_SIMULATED: "${goal.title}" forced into failure state for testing.`
        );

        return res.json({ goal: serializeGoal(failedGoal) });
    } catch (error) {
        console.error('Simulate goal failure error', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    activateProtocol,
    getGoals,
    simulateGoalFailure,
    toggleProtocol,
    updateProtocolConfig,
    verifyManualGoal,
};
