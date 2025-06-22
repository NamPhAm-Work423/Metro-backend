const PaymentGateway = require('../models/paymentGateway.model');
const { AppError } = require('../middlewares/errorHandler');

class PaymentGatewayService {
    async createGateway(gatewayData) {
        try {
            const gateway = new PaymentGateway(gatewayData);
            await gateway.save();
            return gateway;
        } catch (error) {
            throw new AppError('Error creating payment gateway', 500);
        }
    }

    async getGatewayById(id) {
        try {
            const gateway = await PaymentGateway.findById(id);
            if (!gateway) {
                throw new AppError('Payment gateway not found', 404);
            }
            return gateway;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error finding payment gateway', 500);
        }
    }

    async getAllGateways() {
        try {
            const gateways = await PaymentGateway.find();
            return gateways;
        } catch (error) {
            throw new AppError('Error fetching payment gateways', 500);
        }
    }

    async updateGateway(id, updateData) {
        try {
            const gateway = await PaymentGateway.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );
            if (!gateway) {
                throw new AppError('Payment gateway not found', 404);
            }
            return gateway;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error updating payment gateway', 500);
        }
    }

    async deleteGateway(id) {
        try {
            const gateway = await PaymentGateway.findByIdAndDelete(id);
            if (!gateway) {
                throw new AppError('Payment gateway not found', 404);
            }
            return gateway;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error deleting payment gateway', 500);
        }
    }

    async getActiveGateways() {
        try {
            const gateways = await PaymentGateway.find({ status: 'active' });
            return gateways;
        } catch (error) {
            throw new AppError('Error fetching active payment gateways', 500);
        }
    }

    async getGatewayByType(type) {
        try {
            const gateway = await PaymentGateway.findOne({ type });
            if (!gateway) {
                throw new AppError('Payment gateway not found', 404);
            }
            return gateway;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error finding payment gateway', 500);
        }
    }

    async validateGateway(gatewayId) {
        try {
            const gateway = await PaymentGateway.findById(gatewayId);
            if (!gateway) {
                throw new AppError('Payment gateway not found', 404);
            }

            if (gateway.status !== 'active') {
                throw new AppError('Payment gateway is not active', 400);
            }

            // Additional validation logic can be added here
            // For example, checking API credentials, connectivity, etc.

            return gateway;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error validating payment gateway', 500);
        }
    }

    async getGatewayStats() {
        try {
            const totalGateways = await PaymentGateway.countDocuments();
            const activeGateways = await PaymentGateway.countDocuments({ status: 'active' });
            const gatewaysByType = await PaymentGateway.aggregate([
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]);

            return {
                totalGateways,
                activeGateways,
                gatewaysByType
            };
        } catch (error) {
            throw new AppError('Error fetching payment gateway statistics', 500);
        }
    }
}

module.exports = new PaymentGatewayService(); 