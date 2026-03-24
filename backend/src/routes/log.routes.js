const router = require('express').Router();
const { getUserLogs } = require('../controllers/logController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/logs/:userId  – authenticated
router.get('/:userId', authMiddleware, getUserLogs);

module.exports = router;
