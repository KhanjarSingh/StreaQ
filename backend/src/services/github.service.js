const prisma = require('../config/db');
const { generateAccessToken } = require('./auth.service');

const githubLogin = async (accessToken) => {
    const userResponse = await fetch("https://api.github.com/user", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });

    if (!userResponse.ok) {
        throw new Error(`GitHub User fetch failed: ${userResponse.statusText}`);
    }

    const githubUser = await userResponse.json();
    console.log(githubUser)

    let email = githubUser.email;

    try {
        const emailResponse = await fetch("https://api.github.com/user/emails", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });

        if (emailResponse.ok) {
            const emails = await emailResponse.json();
            console.log(emails)
            if (Array.isArray(emails)) {
                const primaryEmailObj = emails.find(e => e.primary && e.verified) || emails.find(e => e.verified) || emails[0];
                if (primaryEmailObj && primaryEmailObj.email) {
                    email = primaryEmailObj.email;
                }
            }
        } else {
            console.warn(`GitHub Email fetch warning: ${emailResponse.status} ${emailResponse.statusText}`);
        }
    } catch (err) {
        console.warn("Error fetching GitHub emails:", err);
    }

    if (!email) {
        throw new Error("No verified email found from GitHub. Please ensure your email is visible or verified.");
    }

    return await proceedWithUser(email, githubUser, accessToken);
}


const proceedWithUser = async (email, githubUser, accessToken) => {

    let user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                email: email,
                username: githubUser.login || `user_${Date.now()}`,
                avatarUrl: githubUser.avatar_url,
                emailVerified: true,
                lastLoginAt: new Date(),
                githubProfile: {
                    create: {
                        githubId: String(githubUser.id),
                        login: githubUser.login,
                        avatarUrl: githubUser.avatar_url,
                        htmlUrl: githubUser.html_url,
                        accessToken: accessToken,
                        lastSyncedAt: new Date()
                    }
                }
            }
        });
    } else {
        user = await prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                avatarUrl: githubUser.avatar_url,
                githubProfile: {
                    upsert: {
                        create: {
                            githubId: String(githubUser.id),
                            login: githubUser.login,
                            avatarUrl: githubUser.avatar_url,
                            htmlUrl: githubUser.html_url,
                            accessToken: accessToken,
                            lastSyncedAt: new Date()
                        },
                        update: {
                            githubId: String(githubUser.id),
                            login: githubUser.login,
                            avatarUrl: githubUser.avatar_url,
                            htmlUrl: githubUser.html_url,
                            accessToken: accessToken,
                            lastSyncedAt: new Date()
                        }
                    }
                }
            }
        });
    }

    const token = generateAccessToken(user.id);

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            avatarUrl: user.avatarUrl
        }
    };
}

module.exports = { githubLogin };