const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { writeSystemLog } = require('./cron.service');
const { DateTime } = require('luxon');
const prisma = new PrismaClient();
const IST_TIMEZONE = 'Asia/Kolkata';

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
        const todayStr = DateTime.now().setZone(IST_TIMEZONE).toISODate();

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
// LEETCODE  – fetch accepted submission totals via public GraphQL API
// ─────────────────────────────────────────────────────────────────────────────

const fetchLeetCodeSubmissions = async (username) => {
    try {
        const query = `
            query userProgress($username: String!) {
                matchedUser(username: $username) {
                    submitStats {
                        acSubmissionNum {
                            difficulty
                            count
                        }
                    }
                }
            }
        `;

        const res = await axios.post(
            'https://leetcode.com/graphql',
            { query, variables: { username } },
            { headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' } }
        );

        const accepted = res.data?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
        const total = accepted.reduce((sum, item) => sum + Number(item?.count || 0), 0);
        return Number.isFinite(total) ? total : 0;
    } catch (e) {
        console.error('[LEETCODE_FETCH_ERROR]', e.message);
        return 0;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CODEFORCES  – unique accepted problems via public API
// ─────────────────────────────────────────────────────────────────────────────

const getCodeforcesSubmissions = async (username) => {
    try {
        const response = await axios.get(
            `https://codeforces.com/api/user.status?handle=${username}`
        );

        if (response.data.status !== 'OK') return 0;

        const acceptedProblemIds = new Set(
            response.data.result
                .filter((submission) => submission.verdict === 'OK' && submission.problem?.contestId && submission.problem?.index)
                .map((submission) => `${submission.problem.contestId}-${submission.problem.index}`)
        );

        return acceptedProblemIds.size;
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
            count = await fetchLeetCodeSubmissions(goal.platformUsername || user.username);
        } else if (platform === 'CODEFORCES') {
            count = await getCodeforcesSubmissions(goal.platformUsername || user.username);
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
