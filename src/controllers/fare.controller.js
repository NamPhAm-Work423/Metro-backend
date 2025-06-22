const FareService = require('../services/fare.service');

class FareController {
    async createFare(req, res) {
        try {
            const fare = await FareService.createFare(req.body);
            res.status(201).json(fare);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getFareById(req, res) {
        try {
            const fare = await FareService.getFareById(req.params.id);
            if (!fare) {
                return res.status(404).json({ message: 'Fare not found' });
            }
            res.json(fare);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAllFares(req, res) {
        try {
            const fares = await FareService.getAllFares(req.query);
            res.json(fares);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateFare(req, res) {
        try {
            const fare = await FareService.updateFare(req.params.id, req.body);
            if (!fare) {
                return res.status(404).json({ message: 'Fare not found' });
            }
            res.json(fare);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async deleteFare(req, res) {
        try {
            const fare = await FareService.deleteFare(req.params.id);
            if (!fare) {
                return res.status(404).json({ message: 'Fare not found' });
            }
            res.json({ message: 'Fare deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async calculateFare(req, res) {
        try {
            const { routeId, passengerType, ticketType } = req.body;
            const fare = await FareService.calculateFare(routeId, passengerType, ticketType);
            res.json(fare);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getFareByRoute(req, res) {
        try {
            const fares = await FareService.getFareByRoute(req.params.routeId);
            res.json(fares);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getFareByPassengerType(req, res) {
        try {
            const fares = await FareService.getFareByPassengerType(req.params.passengerType);
            res.json(fares);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getFareByTicketType(req, res) {
        try {
            const fares = await FareService.getFareByTicketType(req.params.ticketType);
            res.json(fares);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async applyFareDiscount(req, res) {
        try {
            const { fareId, discountId } = req.body;
            const discountedFare = await FareService.applyFareDiscount(fareId, discountId);
            res.json(discountedFare);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new FareController(); 