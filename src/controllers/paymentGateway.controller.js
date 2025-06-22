const PaymentGatewayService = require('../services/paymentGateway.service');

class PaymentGatewayController {
    async initializePayment(req, res) {
        try {
            const { amount, currency, paymentMethod } = req.body;
            const payment = await PaymentGatewayService.initializePayment(amount, currency, paymentMethod);
            res.json(payment);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async processPayment(req, res) {
        try {
            const { paymentId, paymentDetails } = req.body;
            const result = await PaymentGatewayService.processPayment(paymentId, paymentDetails);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async verifyPayment(req, res) {
        try {
            const { paymentId } = req.params;
            const verification = await PaymentGatewayService.verifyPayment(paymentId);
            res.json(verification);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async handleWebhook(req, res) {
        try {
            const result = await PaymentGatewayService.handleWebhook(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPaymentStatus(req, res) {
        try {
            const { paymentId } = req.params;
            const status = await PaymentGatewayService.getPaymentStatus(paymentId);
            res.json(status);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }


    async getAvailablePaymentMethods(req, res) {
        try {
            const methods = await PaymentGatewayService.getAvailablePaymentMethods();
            res.json(methods);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async validatePaymentMethod(req, res) {
        try {
            const { paymentMethod, details } = req.body;
            const validation = await PaymentGatewayService.validatePaymentMethod(paymentMethod, details);
            res.json(validation);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getTransactionHistory(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const history = await PaymentGatewayService.getTransactionHistory(startDate, endDate);
            res.json(history);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updatePaymentGatewaySettings(req, res) {
        try {
            const settings = await PaymentGatewayService.updateSettings(req.body);
            res.json(settings);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new PaymentGatewayController(); 