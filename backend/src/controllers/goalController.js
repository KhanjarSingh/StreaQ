const prisma = require('../config/db');
const { writeSystemLog } = require('../services/cron.service');

const PROTOCOL_TYPES = ['GITHUB', 'LEETCODE', 'MANUAL'];
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

const normalizeProtocolInput = (body = {}, fallbackProtocolType) => {
    const protocolType = body.protocolType || fallbackProtocolType;

    if (!PROTOCOL_TYPES.includes(protocolType)) {
        return { error: 'protocolType must be GITHUB, LEETCODE, or MANUAL' };
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

    return {
        protocolType,
        targetValue,
        dailyDeadline: body.dailyDeadline,
        reminderFrequency: body.reminderFrequency,
        punishmentLevel: body.punishmentLevel,
    };
};

const buildProtocolPayload = (input, existingGoal) => {
    const defaults = PROTOCOL_DEFAULTS[input.protocolType];
    const baseCount = existingGoal?.currentCount ?? 0;
    const normalizedCount = Math.min(baseCount, input.targetValue);

    return {
        title: defaults.title,
        type: defaults.type,
        protocolType: input.protocolType,
        sourcePlatform: defaults.sourcePlatform,
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

const getSecondsUntil = (hhmm) => {
    const [hour = 0, minute = 0] = (hhmm || '22:30').split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
};

const formatClock = (date) => date.toTimeString().slice(0, 5);

const getNextReminderTime = (goal) => {
    const minutes = REMINDER_TO_MINUTES[goal.reminderFrequency] || 30;
    const [hour = 0, minute = 0] = (goal.dailyDeadline || goal.checkInterval || '22:30').split(':').map(Number);
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target <= new Date()) target.setDate(target.getDate() + 1);
    target.setMinutes(target.getMinutes() - minutes);
    return formatClock(target);
};

const serializeGoal = (goal) => {
    const secondsRemaining = getSecondsUntil(goal.dailyDeadline || goal.checkInterval);

    return {
        ...goal,
        nextReminderAt: getNextReminderTime(goal),
        reminderLabel: formatReminderLabel(goal.reminderFrequency),
        secondsRemaining,
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
            timezone: user?.timezone || 'UTC',
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
