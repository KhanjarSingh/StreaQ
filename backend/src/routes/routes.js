const router = require('express').Router()
const authRouter = require('./auth.routes')
const usersRouter = require('./user.routes')
const syncRouter = require('./sync.routes')
const logRouter = require('./log.routes')
const goalRouter = require('./goal.routes')

router.use('/auth', authRouter)
router.use('/users', usersRouter)
router.use('/sync', syncRouter)
router.use('/logs', logRouter)
router.use('/goals', goalRouter)

module.exports = router
