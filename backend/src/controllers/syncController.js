const platformService = require('../services/platform.service');

const isMissingColumnError = (error) => error?.code === 'P2022';

const syncGoals = async (req, res) => {
    try {
        // Mock user ID from request (will need middleware in real prod app)
        // Assuming req.user is populated by JWT middleware, but we'll accept body for testing.
        const userId = req.body.userId || req.user?.id;
        
        if (!userId) {
            return res.status(400).json({ message: "userId required" });
        }

        const syncedGoals = await platformService.syncAutomatedGoals(userId);
        res.status(200).json({ status: "success", syncedGoals });
    } catch (err) {
        console.error("Sync Error:", err);
        if (isMissingColumnError(err)) {
            return res.status(200).json({
                status: "degraded",
                message: "Sync skipped because the database schema is missing a required column.",
                syncedGoals: [],
            });
        }
        res.status(500).json({ message: err.message });
    }
};

module.exports = { syncGoals };
