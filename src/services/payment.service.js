const Payment = require('../models/payment.model');
const Ticket = require('../models/ticket.model');
const { AppError } = require('../middlewares/errorHandler');

class PaymentService {
    async createPayment(paymentData) {
        try {
            const payment = new Payment(paymentData);
            await payment.save();
            return payment;
        } catch (error) {
            throw new AppError('Error creating payment', 500);
        }
    }

    async getPaymentById(id) {
        try {
            const payment = await Payment.findById(id)
                .populate('ticket')
                .populate('paymentGateway');
            if (!payment) {
                throw new AppError('Payment not found', 404);
            }
            return payment;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error finding payment', 500);
        }
    }

    async getAllPayments() {
        try {
            const payments = await Payment.find()
                .populate('ticket')
                .populate('paymentGateway');
            return payments;
        } catch (error) {
            throw new AppError('Error fetching payments', 500);
        }
    }

    async updatePayment(id, updateData) {
        try {
            const payment = await Payment.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate('ticket')
             .populate('paymentGateway');
            if (!payment) {
                throw new AppError('Payment not found', 404);
            }
            return payment;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error updating payment', 500);
        }
    }

    async deletePayment(id) {
        try {
            const payment = await Payment.findByIdAndDelete(id);
            if (!payment) {
                throw new AppError('Payment not found', 404);
            }
            return payment;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error deleting payment', 500);
        }
    }

    async getPaymentsByTicket(ticketId) {
        try {
            const payments = await Payment.find({ ticket: ticketId })
                .populate('paymentGateway');
            return payments;
        } catch (error) {
            throw new AppError('Error fetching ticket payments', 500);
        }
    }

    async getPaymentsByGateway(gatewayId) {
        try {
            const payments = await Payment.find({ paymentGateway: gatewayId })
                .populate('ticket');
            return payments;
        } catch (error) {
            throw new AppError('Error fetching gateway payments', 500);
        }
    }

    async getPaymentsByStatus(status) {
        try {
            const payments = await Payment.find({ status })
                .populate('ticket')
                .populate('paymentGateway');
            return payments;
        } catch (error) {
            throw new AppError('Error fetching payments by status', 500);
        }
    }

    async processPayment(paymentData) {
        try {
            const ticket = await Ticket.findById(paymentData.ticket);
            if (!ticket) {
                throw new AppError('Ticket not found', 404);
            }

            // Create payment record
            const payment = new Payment({
                ...paymentData,
                amount: ticket.amount,
                status: 'pending'
            });
            await payment.save();

            // Process payment through gateway
            // This is a placeholder for actual payment gateway integration
            const paymentResult = await this.processPaymentGateway(payment);

            // Update payment status
            payment.status = paymentResult.success ? 'completed' : 'failed';
            payment.transactionId = paymentResult.transactionId;
            await payment.save();

            // Update ticket status if payment successful
            if (paymentResult.success) {
                ticket.status = 'paid';
                await ticket.save();
            }

            return payment;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error processing payment', 500);
        }
    }

    async processPaymentGateway(payment) {
        // This is a placeholder for actual payment gateway integration
        // In a real implementation, this would call the payment gateway's API
        return {
            success: true,
            transactionId: `TRX${Date.now()}`
        };
    }

    async getPaymentStats() {
        try {
            const totalPayments = await Payment.countDocuments();
            const completedPayments = await Payment.countDocuments({ status: 'completed' });
            const totalAmount = await Payment.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            return {
                totalPayments,
                completedPayments,
                totalAmount: totalAmount[0]?.total || 0
            };
        } catch (error) {
            throw new AppError('Error fetching payment statistics', 500);
        }
    }
}

module.exports = new PaymentService(); 