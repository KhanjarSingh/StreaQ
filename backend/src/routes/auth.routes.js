const authRouter = require('express').Router()
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { signUpValidator, loginValidator } = require('../middleware/validators');

authRouter.get('/health',(req,res)=>{
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
})

authRouter.post('/register',signUpValidator, authController.signup);
authRouter.post('/login', loginValidator,authController.login);




module.exports = authRouter