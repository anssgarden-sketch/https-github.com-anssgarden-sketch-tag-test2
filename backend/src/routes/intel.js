const router = require('express').Router();
const { 
  searchTarget, 
  getMyTags, 
  abortSurveillance, 
  getSurveillanceStatus 
} = require('../controllers/intelController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/search', searchTarget);
router.get('/tags', getMyTags);
router.post('/abort', abortSurveillance);
router.get('/status', getSurveillanceStatus);

module.exports = router;
