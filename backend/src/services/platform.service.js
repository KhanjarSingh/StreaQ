const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { writeSystemLog } = require('./cron.service');
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB  – today's contribution count via GraphQL
// ─────────────────────────────────────────────────────────────────────────────

const getGithubContributions = async (username, token) => {
    try {
        const query = `
            query {
                user(login: "${username}") {
                    contributionsCollection {
                        contributionCalendar {
                            weeks {
                                contributionDays {
                                    date
                                    contributionCount
                                }
                            }
                        }
                    }
                }
            }
        `;

        const response = await axios.post(
            'https://api.github.com/graphql',
            { query },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.errors) return 0;

        const weeks = response.data.data.user.contributionsCollection.contributionCalendar.weeks;
        const todayStr = new Date().toISOString().split('T')[0];

        for (const week of weeks) {
            for (const day of week.contributionDays) {
                if (day.date === todayStr) return day.contributionCount;
            }
        }
        return 0;
    } catch (e) {
        console.error('[GITHUB_FETCH_ERROR]', e.message);
        return 0;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// LEETCODE  – daily challenge completion via official GraphQL API
// ─────────────────────────────────────────────────────────────────────────────

const getLeetCodeDailyStatus = async (username) => {
    try {
        // Step 1: Get today's daily challenge question slug
        const dailyQuery = `
            query questionOfToday {
                activeDailyCodingChallengeQuestion {
                    date
                    question {
                        titleSlug
                        title
                    }
                }
            }
        `;

        const dailyRes = await axios.post(
            'https://leetcode.com/graphql',
            { query: dailyQuery },
            { headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' } }
        );

        const dailySlug = dailyRes.data?.data?.activeDailyCodingChallengeQuestion?.question?.titleSlug;
        if (!dailySlug) return 0;

        // Step 2: Check if the user has a recent accepted submission for that slug
        const submissionQuery = `
            query recentAcSubmissions($username: String!, $limit: Int!) {
                recentAcSubmissionList(username: $username, limit: $limit) {
                    titleSlug
                }
            }
        `;

        const subRes = await axios.post(
            'https://leetcode.com/graphql',
            { query: submissionQuery, variables: { username, limit: 20 } },
            { headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' } }
        );

        const submissions = subRes.data?.data?.recentAcSubmissionList || [];
        const solved = submissions.some(s => s.titleSlug === dailySlug);
        return solved ? 1 : 0;

    } catch (e) {
        console.error('[LEETCODE_FETCH_ERROR]', e.message);
        return 0;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CODEFORCES  – submissions today via public API
// ─────────────────────────────────────────────────────────────────────────────

const getCodeforcesSubmissions = async (username) => {
    try {
        const response = await axios.get(
            `https://codeforces.com/api/user.status?handle=${username}&from=1&count=20`
        );

        if (response.data.status !== 'OK') return 0;

        const todayStr = new Date().toISOString().split('T')[0];
        const todayStart = new Date(todayStr).getTime() / 1000; // unix timestamp

        const accepted = response.data.result.filter(sub =>
            sub.verdict === 'OK' && sub.creationTimeSeconds >= todayStart
        );

        return accepted.length;
    } catch (e) {
        console.error('[CODEFORCES_FETCH_ERROR]', e.message);
        return 0;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SYNC  – orchestrates all automated goals, writes audit logs
// ─────────────────────────────────────────────────────────────────────────────

const syncAutomatedGoals = async (userId) => {
    if (!userId) return [];

    const goals = await prisma.goal.findMany({
        where: { userId, type: 'AUTOMATED' }
    });

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { githubProfile: true }
    });

    if (!user) return [];

    const results = await Promise.all(goals.map(async (goal) => {
        let count = 0;
        let platform = goal.sourcePlatform;

        if (platform === 'GITHUB' && user.githubProfile?.accessToken) {
            count = await getGithubContributions(user.githubProfile.login, user.githubProfile.accessToken);
        } else if (platform === 'LEETCODE') {
            count = await getLeetCodeDailyStatus(user.username);
        } else if (platform === 'CODEFORCES') {
            count = await getCodeforcesSubmissions(user.username);
        }

        const isCompleted = count >= goal.targetCount;

        // ── Audit log ────────────────────────────────────────────────────────
        const level = isCompleted ? 'SUCCESS' : 'INFO';
        const msg = isCompleted
            ? `[SUCCESS] ${platform}_SYNC: ${count} detected. Goal "${goal.title}" MET.`
            : `[INFO] ${platform}_SYNC: ${count}/${goal.targetCount} "${goal.title}". Goal not yet met.`;

        console.log(msg);
        await writeSystemLog(userId, level, msg);

        return prisma.goal.update({
            where: { id: goal.id },
            data: {
                currentCount: count,
                isCompleted,
                lastSyncedAt: new Date()
            }
        });
    }));

    // Update user.lastSyncedAt
    await prisma.user.update({
        where: { id: userId },
        data: { lastSyncedAt: new Date() }
    });

    return results;
};

module.exports = { syncAutomatedGoals };
