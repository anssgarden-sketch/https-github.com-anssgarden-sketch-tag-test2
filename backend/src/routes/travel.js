const router = require('express').Router();
const { initiateTravel, getTravelMap, cancelTravel } = require('../controllers/travelController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/map', getTravelMap);
router.post('/initiate', initiateTravel);
router.post('/cancel', cancelTravel);

module.exports = router;