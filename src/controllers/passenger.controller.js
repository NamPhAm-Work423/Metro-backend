const PassengerService = require('../services/passenger.service');

class PassengerController {
    async createPassenger(req, res) {
        try {
            const passenger = await PassengerService.createPassenger(req.body);
            res.status(201).json(passenger);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPassengerById(req, res) {
        try {
            const passenger = await PassengerService.getPassengerById(req.params.id);
            if (!passenger) {
                return res.status(404).json({ message: 'Passenger not found' });
            }
            res.json(passenger);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAllPassengers(req, res) {
        try {
            const passengers = await PassengerService.getAllPassengers();
            res.json(passengers);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updatePassenger(req, res) {
        try {
            const passenger = await PassengerService.updatePassenger(req.params.id, req.body);
            if (!passenger) {
                return res.status(404).json({ message: 'Passenger not found' });
            }
            res.json(passenger);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async deletePassenger(req, res) {
        try {
            const passenger = await PassengerService.deletePassenger(req.params.id);
            if (!passenger) {
                return res.status(404).json({ message: 'Passenger not found' });
            }
            res.json({ message: 'Passenger deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPassengerTickets(req, res) {
        try {
            const tickets = await PassengerService.getPassengerTickets(req.params.id);
            res.json(tickets);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPassengerHistory(req, res) {
        try {
            const history = await PassengerService.getPassengerHistory(req.params.id);
            res.json(history);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new PassengerController(); 