const crypto = require('crypto');
const github = require('../lib/oauth/github');
const githubService = require('../services/github.service');

const getGithubLoginPage = async (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = req.query.redirect_uri || "streaq://auth-callback";

    const { url } = github.getWebFlowAuthorizationUrl({
        state,
        scopes: ["user:email", "repo"],
    });

    res.cookie("github_oauth_state", state, {
        path: "/",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 60 * 10 * 1000,
        sameSite: "lax"
    });

    res.cookie("github_redirect_uri", redirectUri, {
        path: "/",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 60 * 10 * 1000,
        sameSite: "lax"
    });

    res.redirect(url);
}

const githubCallback = async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    const storedState = req.cookies?.github_oauth_state;
    const redirectUri = req.cookies?.github_redirect_uri || "streaq://auth-callback";


    const redirectBase = redirectUri.includes('?') ? redirectUri + '&' : redirectUri + '?'; 
    const error = req.query.error;
    if (error) {
        return res.redirect(`${redirectBase}error=access_denied`);
    }

    if (!code || !state || !storedState || state !== storedState) {
        return res.redirect(`${redirectBase}error=invalid_state`);
    }

    try {
        const { authentication } = await github.createToken({
            code,
            state,
        });


        const { token } = await githubService.githubLogin(authentication.token);

        res.redirect(`${redirectBase}token=${token}`);

    } catch (e) {
        console.error("GitHub OAuth Error:", e);
        res.redirect(`${redirectBase}error=authentication_failed`);
    }
};
module.exports = { getGithubLoginPage, githubCallback };