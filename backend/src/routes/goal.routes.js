const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const {
    getGoals,
    verifyManualGoal,
    simulateGoalFailure,
} = require('../controllers/goalController');

router.get('/', authMiddleware, getGoals);
router.patch('/:goalId/verify', authMiddleware, verifyManualGoal);
router.post('/:goalId/simulate-failure', authMiddleware, simulateGoalFailure);

module.exports = router;
