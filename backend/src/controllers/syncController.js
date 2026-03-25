const platformService = require('../services/platform.service');
const prisma = require('../config/db');
const { writeSystemLog } = require('../services/cron.service');

const isMissingColumnError = (error) => error?.code === 'P2022';

const getManualGoalsNeedingReview = async (userId) => {
    const manualGoals = await prisma.goal.findMany({
        where: {
            userId,
            type: 'MANUAL',
            isCompleted: true,
        },
        select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return manualGoals.filter((goal) => {
        const createdAt = new Date(goal.createdAt).getTime();
        const updatedAt = new Date(goal.updatedAt).getTime();
        return updatedAt - createdAt <= 60 * 1000;
    });
};

const syncGoals = async (req, res) => {
    try {
        // Mock user ID from request (will need middleware in real prod app)
        // Assuming req.user is populated by JWT middleware, but we'll accept body for testing.
        const userId = req.body.userId || req.user?.id;
        
        if (!userId) {
            return res.status(400).json({ message: "userId required" });
        }

        const syncedGoals = await platformService.syncAutomatedGoals(userId);
        const flaggedManualGoals = await getManualGoalsNeedingReview(userId);

        if (flaggedManualGoals.length > 0) {
            console.warn('[MANUAL_GOAL_REVIEW_REQUIRED]', flaggedManualGoals);
            await writeSystemLog(
                userId,
                'WARNING',
                `[WARNING] MANUAL_PROTOCOL_REVIEW: ${flaggedManualGoals.map((goal) => goal.title).join(', ')} completed within 60 seconds of creation.`
            );
            return res.status(200).json({
                status: "review_required",
                message: "One or more manual goals were completed too quickly and have been flagged for review.",
                goals: syncedGoals,
                syncedGoals,
                flaggedManualGoals,
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Sync complete",
            goals: syncedGoals,
            syncedGoals,
        });
    } catch (err) {
        console.error("Sync Error:", err);
        if (isMissingColumnError(err)) {
            return res.status(200).json({
                status: "degraded",
                message: "Sync skipped because the database schema is missing a required column.",
                goals: [],
                syncedGoals: [],
            });
        }
        return res.status(500).json({ message: err.message });
    }
};

module.exports = { syncGoals };
