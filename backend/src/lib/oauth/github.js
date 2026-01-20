const { OAuthApp } = require("@octokit/oauth-app");

const github = new OAuthApp({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
});

module.exports = github;