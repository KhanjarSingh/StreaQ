const authRouter = require('express').Router()
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { signUpValidator, loginValidator } = require('../middleware/validators');

const githubController = require('../controllers/githubController');

authRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
})

authRouter.post('/register', signUpValidator, authController.signup);
authRouter.post('/login', loginValidator, authController.login);

authRouter.get('/github', githubController.getGithubLoginPage);
authRouter.get('/github/callback', githubController.githubCallback);





module.exports = authRouter