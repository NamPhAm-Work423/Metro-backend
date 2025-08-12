const express = require('express');
const router = express.Router();
const transitPassController = require('../controllers/transitPass.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Public (authenticated) reads
router.get('/getActiveTransitPasses', ...authorizeRoles('passenger', 'staff', 'admin'), transitPassController.getActiveTransitPasses);
router.get('/getTransitPassByType/:transitPassType', ...authorizeRoles('passenger', 'staff', 'admin'), transitPassController.getTransitPassByType);
router.get('/getTransitPassesByCurrency/:currency', ...authorizeRoles('passenger', 'staff', 'admin'), transitPassController.getTransitPassesByCurrency);

// Admin/staff reads
router.get('/getAllTransitPasses', ...authorizeRoles('staff', 'admin'), transitPassController.getAllTransitPasses);
router.get('/getTransitPassById/:id', ...authorizeRoles('staff', 'admin'), transitPassController.getTransitPassById);

// Admin writes
router.post('/createTransitPass', ...authorizeRoles('admin'), transitPassController.createTransitPass);
router.put('/updateTransitPass/:id', ...authorizeRoles('admin'), transitPassController.updateTransitPass);
router.delete('/deleteTransitPass/:id', ...authorizeRoles('admin'), transitPassController.deleteTransitPass);
router.put('/setTransitPassActive/:id', ...authorizeRoles('admin'), transitPassController.setTransitPassActive);
router.put('/bulkUpdateTransitPasses', ...authorizeRoles('admin'), transitPassController.bulkUpdateTransitPasses);

module.exports = router;


