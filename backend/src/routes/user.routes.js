const usersRouter = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const prisma = require('../config/db');
const { getGithubFullProfile } = require('../services/platform.service');

// GET /api/users/me  – minimal user for auth checks
usersRouter.get('/me', authMiddleware, async (req, res) => {
    try {
        const [user, protocolPromptGoal] = await Promise.all([
            prisma.user.findUnique({
                where: { id: req.user.id },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    avatarUrl: true,
                    timezone: true,
                    githubProfile: true,
                }
            }),
            prisma.goal.findFirst({
                where: {
                    userId: req.user.id,
                    requiresConfiguration: true,
                    isActive: true,
                },
                select: { id: true, protocolType: true },
            }),
        ]);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({
            ...user,
            protocolPromptRequired: Boolean(protocolPromptGoal),
            pendingProtocolType: protocolPromptGoal?.protocolType || null,
        });
    } catch (e) {
        console.error('Fetch user error', e);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/users/profile  – full profile with live GitHub data
usersRouter.get('/profile', authMiddleware, async (req, res) => {
    try {
        const [user, protocols] = await Promise.all([
            prisma.user.findUnique({
                where: { id: req.user.id },
                include: { githubProfile: true }
            }),
            prisma.goal.findMany({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    protocolType: true,
                    isActive: true,
                    requiresConfiguration: true,
                    targetValue: true,
                    dailyDeadline: true,
                    reminderFrequency: true,
                    punishmentLevel: true,
                },
            }),
        ]);
        if (!user) return res.status(404).json({ message: 'User not found' });

        let github = null;
        if (user.githubProfile?.login && user.githubProfile?.accessToken) {
            try {
                github = await getGithubFullProfile(
                    user.githubProfile.login,
                    user.githubProfile.accessToken
                );
            } catch (e) {
                console.warn('[PROFILE] GitHub fetch failed:', e.message);
                // Return DB-cached avatar at minimum
                github = {
                    login: user.githubProfile.login,
                    avatarUrl: user.githubProfile.avatarUrl,
                    htmlUrl: user.githubProfile.htmlUrl,
                    publicRepos: null,
                    followers: null,
                    following: null,
                    totalContributions: null,
                    contributions: [],
                };
            }
        }

        return res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl,
                timezone: user.timezone,
                githubLogin: user.githubProfile?.login || null,
                githubUrl: user.githubProfile?.htmlUrl || null,
                protocolPromptRequired: protocols.some((protocol) => protocol.requiresConfiguration && protocol.isActive),
            },
            github,
            protocols,
        });
    } catch (e) {
        console.error('Profile fetch error', e);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/users/me  – update timezone
usersRouter.patch('/me', authMiddleware, async (req, res) => {
    const { timezone } = req.body;
    if (!timezone || typeof timezone !== 'string') {
        return res.status(400).json({ message: 'timezone string required' });
    }
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { timezone },
            select: { id: true, timezone: true }
        });
        res.json(user);
    } catch (e) {
        console.error('Update timezone error', e);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/users/push-token  – update expoPushToken
usersRouter.patch('/push-token', authMiddleware, async (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'token string required' });
    }
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { expoPushToken: token },
            select: { id: true, expoPushToken: true }
        });
        res.json(user);
    } catch (e) {
        console.error('Update push token error', e);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = usersRouter;
