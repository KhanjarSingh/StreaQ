const usersRouter = require('express').Router();
const { authMiddleware } = require('../middleware/auth');

usersRouter.get('/me', authMiddleware, (req, res) => {
  res.json({
    userId: req.user.id
  });
});

module.exports = usersRouter;
