const router = require('express').Router()
const authRouter = require('./auth.routes')
const usersRouter = require('./user.routes')



router.use('/auth',authRouter)
router.use('/users',usersRouter)


module.exports = router