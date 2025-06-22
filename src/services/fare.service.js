const Fare = require('../models/fare.model');
const { AppError } = require('../middlewares/errorHandler');

class FareService {
    async createFare(fareData) {
        try {
            const fare = new Fare(fareData);
            await fare.save();
            return fare;
        } catch (error) {
            throw new AppError('Error creating fare', 500);
        }
    }

    async getFareById(id) {
        try {
            const fare = await Fare.findById(id)
                .populate('route')
                .populate('ticketType');
            if (!fare) {
                throw new AppError('Fare not found', 404);
            }
            return fare;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error finding fare', 500);
        }
    }

    async getAllFares() {
        try {
            const fares = await Fare.find()
                .populate('route')
                .populate('ticketType');
            return fares;
        } catch (error) {
            throw new AppError('Error fetching fares', 500);
        }
    }

    async updateFare(id, updateData) {
        try {
            const fare = await Fare.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate('route')
             .populate('ticketType');
            if (!fare) {
                throw new AppError('Fare not found', 404);
            }
            return fare;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error updating fare', 500);
        }
    }

    async deleteFare(id) {
        try {
            const fare = await Fare.findByIdAndDelete(id);
            if (!fare) {
                throw new AppError('Fare not found', 404);
            }
            return fare;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error deleting fare', 500);
        }
    }

    async getFaresByRoute(routeId) {
        try {
            const fares = await Fare.find({ route: routeId })
                .populate('ticketType');
            return fares;
        } catch (error) {
            throw new AppError('Error fetching route fares', 500);
        }
    }

    async getFaresByTicketType(ticketTypeId) {
        try {
            const fares = await Fare.find({ ticketType: ticketTypeId })
                .populate('route');
            return fares;
        } catch (error) {
            throw new AppError('Error fetching ticket type fares', 500);
        }
    }

    async calculateFare(routeId, ticketTypeId, quantity = 1) {
        try {
            const fare = await Fare.findOne({ route: routeId, ticketType: ticketTypeId });
            if (!fare) {
                throw new AppError('Fare not found for the specified route and ticket type', 404);
            }
            return fare.amount * quantity;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error calculating fare', 500);
        }
    }

    async getFareStats() {
        try {
            const totalFares = await Fare.countDocuments();
            const activeFares = await Fare.countDocuments({ status: 'active' });
            const averageFare = await Fare.aggregate([
                { $group: { _id: null, avgAmount: { $avg: '$amount' } } }
            ]);

            return {
                totalFares,
                activeFares,
                averageFare: averageFare[0]?.avgAmount || 0
            };
        } catch (error) {
            throw new AppError('Error fetching fare statistics', 500);
        }
    }
}

module.exports = new FareService(); 