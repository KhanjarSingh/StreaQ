const usersRouter = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const prisma = require('../config/db');

usersRouter.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        githubProfile: true
        // Add other fields if necessary
      }
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (e) {
    console.error("Fetch user error", e);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = usersRouter;
