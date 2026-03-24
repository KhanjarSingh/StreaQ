const router = require('express').Router();
const syncController = require('../controllers/syncController');

router.post('/', syncController.syncGoals);
router.get('/', syncController.syncGoals); // Both for ease of testing

module.exports = router;
