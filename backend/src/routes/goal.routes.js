const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const {
    activateProtocol,
    getGoals,
    simulateGoalFailure,
    toggleProtocol,
    updateProtocolConfig,
    verifyManualGoal,
} = require('../controllers/goalController');

router.get('/', authMiddleware, getGoals);
router.post('/protocols', authMiddleware, activateProtocol);
router.patch('/:goalId/config', authMiddleware, updateProtocolConfig);
router.patch('/:goalId/toggle', authMiddleware, toggleProtocol);
router.patch('/:goalId/verify', authMiddleware, verifyManualGoal);
router.post('/:goalId/simulate-failure', authMiddleware, simulateGoalFailure);

module.exports = router;
