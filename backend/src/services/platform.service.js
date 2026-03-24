const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { writeSystemLog } = require('./cron.service');
const prisma = new PrismaClient();

const isMissingColumnError = (error) => error?.code === 'P2022';

const safePrismaCall = async (label, operation, fallbackValue) => {
    try {
        return await operation();
    } catch (error) {
        if (isMissingColumnError(error)) {
            console.error(`[PRISMA_SCHEMA_MISMATCH] ${label}`, {
                code: error.code,
                message: error.message,
                meta: error.meta,
            });
            return fallbackValue;
        }
        throw error;
    }
};

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
// LEETCODE  – fetch recent submissions via official GraphQL API
// ─────────────────────────────────────────────────────────────────────────────

const fetchLeetCodeSubmissions = async (username) => {
    try {
        const query = `
            query recentAcSubmissions($username: String!, $limit: Int!) {
                recentAcSubmissionList(username: $username, limit: $limit) {
                    titleSlug
                    timestamp
                }
            }
        `;

        const res = await axios.post(
            'https://leetcode.com/graphql',
            { query, variables: { username, limit: 20 } },
            { headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' } }
        );

        const submissions = res.data?.data?.recentAcSubmissionList || [];
        if (!submissions.length) return 0;

        const todayStr = new Date().toISOString().split('T')[0];
        
        const count = submissions.filter(sub => {
            const subDate = new Date(parseInt(sub.timestamp) * 1000).toISOString().split('T')[0];
            return subDate === todayStr;
        }).length;

        return count;
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

    const goals = await safePrismaCall(
        `goal.findMany for user ${userId}`,
        () => prisma.goal.findMany({
            where: { userId, type: 'AUTOMATED', isActive: true }
        }),
        []
    );

    const user = await safePrismaCall(
        `user.findUnique for sync user ${userId}`,
        () => prisma.user.findUnique({
            where: { id: userId },
            include: { githubProfile: true }
        }),
        null
    );

    if (!user) return [];

    const results = await Promise.all(goals.map(async (goal) => {
        let count = 0;
        let platform = goal.sourcePlatform;

        if (platform === 'GITHUB' && user.githubProfile?.accessToken) {
            count = await getGithubContributions(user.githubProfile.login, user.githubProfile.accessToken);
        } else if (platform === 'LEETCODE') {
            count = await fetchLeetCodeSubmissions(user.username);
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

        return safePrismaCall(
            `goal.update for goal ${goal.id}`,
            () => prisma.goal.update({
                where: { id: goal.id },
                data: {
                    currentCount: count,
                    isCompleted,
                    lastSyncedAt: new Date()
                }
            }),
            {
                ...goal,
                currentCount: count,
                isCompleted,
                lastSyncedAt: goal.lastSyncedAt || null,
            }
        );
    }));

    // Update user.lastSyncedAt
    await safePrismaCall(
        `user.update lastSyncedAt for user ${userId}`,
        () => prisma.user.update({
            where: { id: userId },
            data: { lastSyncedAt: new Date() }
        }),
        null
    );

    return results;
};

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB FULL PROFILE  – REST stats + full contribution calendar
// ─────────────────────────────────────────────────────────────────────────────

const getGithubFullProfile = async (login, token) => {
    const headers = { Authorization: `Bearer ${token}` };

    // REST API — profile stats
    const profileRes = await axios.get(
        `https://api.github.com/users/${login}`,
        { headers }
    );
    const p = profileRes.data;

    // GraphQL — full contribution calendar
    const query = `
        query {
            user(login: "${login}") {
                contributionsCollection {
                    contributionCalendar {
                        totalContributions
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
    const gql = await axios.post(
        'https://api.github.com/graphql',
        { query },
        { headers }
    );

    const calendar = gql.data?.data?.user?.contributionsCollection?.contributionCalendar;
    const contributions = [];
    for (const week of (calendar?.weeks || [])) {
        for (const day of week.contributionDays) {
            contributions.push({ date: day.date, count: day.contributionCount });
        }
    }

    return {
        login: p.login,
        name: p.name,
        bio: p.bio,
        location: p.location,
        avatarUrl: p.avatar_url,
        publicRepos: p.public_repos,
        followers: p.followers,
        following: p.following,
        totalContributions: calendar?.totalContributions || 0,
        contributions,
    };
};

module.exports = { syncAutomatedGoals, getGithubFullProfile, fetchLeetCodeSubmissions };
