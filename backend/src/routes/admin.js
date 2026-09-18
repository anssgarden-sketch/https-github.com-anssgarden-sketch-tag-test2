const router = require('express').Router();
const adminController = require('../controllers/adminController');

// Authentication: login requires username & password, verify checks existing token
router.post('/auth/login', adminController.login);
router.post('/auth/verify', adminController.verifySession);

// All subsequent routes require admin key
router.use(adminController.verifyAdmin);

// Data bundle
router.get('/data', adminController.getAdminData);

// Skills
router.post('/skills', adminController.createSkill);
router.put('/skills/:id', adminController.updateSkill);
router.delete('/skills/:id', adminController.deleteSkill);

// Cities
router.post('/cities', adminController.createCity);
router.put('/cities/:id', adminController.updateCity);
router.delete('/cities/:id', adminController.deleteCity);

// Travel connections
router.post('/connections/rail', adminController.addRailConnection);
router.delete('/connections/rail/:id', adminController.deleteRailConnection);
router.post('/connections/water', adminController.addWaterRoute);
router.delete('/connections/water/:id', adminController.deleteWaterRoute);

// Config
router.put('/config', adminController.updateConfig);

// Players / Operatives AP & Credits Management
router.get('/players', adminController.getPlayers);
router.put('/players/:id/resources', adminController.updatePlayerResources);

// NPC Generator
router.post('/npcs/generate', adminController.generateNpcs);

// Admin Impersonate Operative (Allows playing as an NPC or testing as player)
router.post('/impersonate/:characterId', adminController.impersonateOperative);

module.exports = router;
