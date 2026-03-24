const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/logs/:userId?limit=50
const getUserLogs = async (req, res) => {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    if (!userId) return res.status(400).json({ error: 'userId required' });

    const logs = await prisma.systemLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: { id: true, level: true, message: true, timestamp: true }
    });

    // Return in chronological order for the terminal (oldest first)
    return res.json({ logs: logs.reverse() });
};

module.exports = { getUserLogs };
