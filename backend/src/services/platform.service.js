const axios = require('axios');
const prisma = require('../config/db');
const { writeSystemLogs } = require('./cron.service');
const { DateTime } = require('luxon');
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

const getIstDayBounds = () => {
    const nowIst = DateTime.now().setZone(IST_TIMEZONE);
    return {
        startOfDay: nowIst.startOf('day'),
        endOfDay: nowIst.endOf('day'),
    };
};

const isUnixTimestampTodayInIst = (timestampSeconds) => {
    const parsedTimestamp = Number(timestampSeconds);
    if (!Number.isFinite(parsedTimestamp)) return false;

    const submissionTime = DateTime.fromSeconds(parsedTimestamp, { zone: 'utc' }).setZone(IST_TIMEZONE);
    const { startOfDay, endOfDay } = getIstDayBounds();

    return submissionTime >= startOfDay && submissionTime <= endOfDay;
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

const verifyLeetCodeDaily = async (username) => {
    if (!username) return 0;

    try {
        const response = await axios.post(
            'https://leetcode.com/graphql',
            {
                query: 'query recentAcSubmissions($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp } }',
                variables: {
                    username,
                    limit: 20,
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            }
        );

        const submissions = Array.isArray(response.data?.data?.recentAcSubmissionList)
            ? response.data.data.recentAcSubmissionList
            : [];
        const nowIst = DateTime.now().setZone(IST_TIMEZONE);
        const startOfDayISTUnixMs = nowIst.startOf('day').toUTC().toMillis();
        const endOfDayISTUnixMs = nowIst.endOf('day').toUTC().toMillis();
        const solvedToday = new Set();

        submissions.forEach((submission) => {
            const parsedTimestampSeconds = Number.parseInt(submission?.timestamp, 10);
            if (!Number.isFinite(parsedTimestampSeconds)) return;

            const submissionDate = new Date(parsedTimestampSeconds * 1000);
            const submissionUnixMs = submissionDate.getTime();

            if (!Number.isFinite(submissionUnixMs)) return;
            if (submissionUnixMs < startOfDayISTUnixMs || submissionUnixMs > endOfDayISTUnixMs) return;

            const slug = submission?.titleSlug;
            if (typeof slug === 'string' && slug.trim()) {
                solvedToday.add(slug.trim());
            }
        });

        return solvedToday.size;
    } catch (e) {
        console.error('[LEETCODE_ERROR]', e.message);
        return 0;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CODEFORCES  – unique accepted problems via public API
// ─────────────────────────────────────────────────────────────────────────────

const verifyCodeforcesDaily = async (username) => {
    if (!username) return 0;

    try {
        const response = await axios.get(
            `https://codeforces.com/api/user.status?handle=${encodeURIComponent(username)}`
        );

        if (response.data.status !== 'OK') return 0;

        const submissions = Array.isArray(response.data?.result) ? response.data.result : [];
        const acceptedProblemIds = new Set();

        submissions.forEach((submission) => {
            if (submission?.verdict !== 'OK') return;
            if (!isUnixTimestampTodayInIst(submission?.creationTimeSeconds)) return;

            const problemId = submission?.problem?.name
                || (
                    submission?.problem?.contestId && submission?.problem?.index
                        ? `${submission.problem.contestId}-${submission.problem.index}`
                        : null
                );

            if (problemId) {
                acceptedProblemIds.add(problemId);
            }
        });

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

    const results = [];
    const logEntries = [];

    for (const goal of goals) {
        let count = 0;
        let platform = goal.sourcePlatform;

        if (platform === 'GITHUB' && user.githubProfile?.accessToken) {
            count = await getGithubContributions(user.githubProfile.login, user.githubProfile.accessToken);
        } else if (platform === 'LEETCODE') {
            count = await verifyLeetCodeDaily(goal.platformUsername || user.username);
        } else if (platform === 'CODEFORCES') {
            count = await verifyCodeforcesDaily(goal.platformUsername || user.username);
        }

        const isCompleted = count >= goal.targetCount;

        // ── Audit log ────────────────────────────────────────────────────────
        const level = isCompleted ? 'SUCCESS' : 'INFO';
        const msg = isCompleted
            ? `[SUCCESS] ${platform}_SYNC: ${count} detected. Goal "${goal.title}" MET.`
            : `[INFO] ${platform}_SYNC: ${count}/${goal.targetCount} "${goal.title}". Goal not yet met.`;

        console.log(msg);
        logEntries.push({ userId, level, message: msg });

        const updatedGoal = await safePrismaCall(
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
        results.push(updatedGoal);
    }

    await writeSystemLogs(logEntries);

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

module.exports = {
    syncAutomatedGoals,
    getGithubFullProfile,
    verifyLeetCodeDaily,
    verifyCodeforcesDaily,
};
