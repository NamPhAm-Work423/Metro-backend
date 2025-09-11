const express = require('express');
const QRController = require('../controllers/qr.controller');

const router = express.Router();
const controller = new QRController();

router.get('/:ticketId', controller.getQR.bind(controller));

module.exports = router;
