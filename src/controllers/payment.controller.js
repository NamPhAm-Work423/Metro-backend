const PaymentService = require('../services/payment.service');

class PaymentController {
    async createPayment(req, res) {
        try {
            const payment = await PaymentService.createPayment(req.body);
            res.status(201).json(payment);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPaymentById(req, res) {
        try {
            const payment = await PaymentService.getPaymentById(req.params.id);
            if (!payment) {
                return res.status(404).json({ message: 'Payment not found' });
            }
            res.json(payment);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAllPayments(req, res) {
        try {
            const payments = await PaymentService.getAllPayments(req.query);
            res.json(payments);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async processPayment(req, res) {
        try {
            const { paymentId, paymentMethod } = req.body;
            const result = await PaymentService.processPayment(paymentId, paymentMethod);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async refundPayment(req, res) {
        try {
            const { paymentId, reason } = req.body;
            const result = await PaymentService.refundPayment(paymentId, reason);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPaymentHistory(req, res) {
        try {
            const { userId } = req.params;
            const history = await PaymentService.getPaymentHistory(userId);
            res.json(history);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPaymentMethods(req, res) {
        try {
            const methods = await PaymentService.getPaymentMethods();
            res.json(methods);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async validatePayment(req, res) {
        try {
            const { paymentId } = req.params;
            const validation = await PaymentService.validatePayment(paymentId);
            res.json(validation);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPaymentReceipt(req, res) {
        try {
            const { paymentId } = req.params;
            const receipt = await PaymentService.getPaymentReceipt(paymentId);
            res.json(receipt);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updatePaymentStatus(req, res) {
        try {
            const { paymentId } = req.params;
            const { status } = req.body;
            const result = await PaymentService.updatePaymentStatus(paymentId, status);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new PaymentController(); 