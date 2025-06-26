const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const authMiddleware = require('../middlewares/auth.middleware');


router.get('/', authMiddleware.authenticate, serviceController.getAllService);
router.post('/', authMiddleware.authenticate, serviceController.createService);

router.get('/:serviceId', authMiddleware.authenticate, serviceController.getServiceById);
router.put('/:serviceId', authMiddleware.authenticate, serviceController.updateService);
router.delete('/:serviceId', authMiddleware.authenticate, serviceController.deleteService);

router.get('/:serviceId/instances', authMiddleware.authenticate, serviceController.getServiceInstances);
router.post('/:serviceId/instances', authMiddleware.authenticate, serviceController.createNewInstance);

router.get('/:serviceId/instances/:instanceId', authMiddleware.authenticate, serviceController.getInstanceById);
router.put('/:serviceId/instances/:instanceId', authMiddleware.authenticate, serviceController.updateInstance);
router.delete('/:serviceId/instances/:instanceId', authMiddleware.authenticate, serviceController.deleteInstance);

module.exports = router;