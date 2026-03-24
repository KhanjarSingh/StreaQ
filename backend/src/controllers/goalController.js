const prisma = require('../config/db');
const { writeSystemLog } = require('../services/cron.service');

const getGoals = async (req, res) => {
    try {
        const [user, goals] = await Promise.all([
            prisma.user.findUnique({
                where: { id: req.user.id },
                select: { timezone: true },
            }),
            prisma.goal.findMany({
                where: { userId: req.user.id },
                orderBy: [
                    { type: 'asc' },
                    { createdAt: 'asc' },
                ],
            }),
        ]);

        return res.json({
            goals,
            timezone: user?.timezone || 'UTC',
        });
    } catch (error) {
        console.error('Fetch goals error', error);
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
            return res.status(404).json({ message: 'Manual goal not found' });
        }

        const verifiedGoal = await prisma.goal.update({
            where: { id: goal.id },
            data: {
                currentCount: goal.targetCount,
                isCompleted: true,
                lastSyncedAt: new Date(),
            },
        });

        const evidenceBits = [note?.trim(), link?.trim()].filter(Boolean);
        const evidenceSuffix = evidenceBits.length > 0
            ? ` Evidence: ${evidenceBits.join(' | ')}`
            : '';

        await writeSystemLog(
            req.user.id,
            'SUCCESS',
            `[SUCCESS] MANUAL_VERIFY: "${goal.title}" verified.${evidenceSuffix}`
        );

        return res.json({ goal: verifiedGoal });
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
            return res.status(404).json({ message: 'Goal not found' });
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
                reason: `Simulated failure for "${goal.title}" from the command center.`,
            },
        });

        await writeSystemLog(
            req.user.id,
            'CRITICAL',
            `[CRITICAL] FAILURE_SIMULATED: "${goal.title}" forced into failure state for testing.`
        );

        return res.json({ goal: failedGoal });
    } catch (error) {
        console.error('Simulate goal failure error', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getGoals,
    verifyManualGoal,
    simulateGoalFailure,
};
