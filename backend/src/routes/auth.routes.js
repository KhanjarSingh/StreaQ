const authRouter = require('express').Router()
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

authRouter.get('/health',(req,res)=>{
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
})

authRouter.post('/register', authController.signup);
authRouter.post('/login', authController.login);




module.exports = authRouter