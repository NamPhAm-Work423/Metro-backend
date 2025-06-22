const StationService = require('../services/station.service');

class StationController {
    async createStation(req, res) {
        try {
            const station = await StationService.createStation(req.body);
            res.status(201).json(station);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getStationById(req, res) {
        try {
            const station = await StationService.getStationById(req.params.id);
            if (!station) {
                return res.status(404).json({ message: 'Station not found' });
            }
            res.json(station);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAllStations(req, res) {
        try {
            const stations = await StationService.getAllStations(req.query);
            res.json(stations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateStation(req, res) {
        try {
            const station = await StationService.updateStation(req.params.id, req.body);
            if (!station) {
                return res.status(404).json({ message: 'Station not found' });
            }
            res.json(station);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async deleteStation(req, res) {
        try {
            const station = await StationService.deleteStation(req.params.id);
            if (!station) {
                return res.status(404).json({ message: 'Station not found' });
            }
            res.json({ message: 'Station deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getStationSchedule(req, res) {
        try {
            const schedule = await StationService.getStationSchedule(req.params.id);
            res.json(schedule);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getStationStaff(req, res) {
        try {
            const staff = await StationService.getStationStaff(req.params.id);
            res.json(staff);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getStationFacilities(req, res) {
        try {
            const facilities = await StationService.getStationFacilities(req.params.id);
            res.json(facilities);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateStationStatus(req, res) {
        try {
            const status = await StationService.updateStationStatus(
                req.params.id,
                req.body.status
            );
            res.json(status);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getStationStatistics(req, res) {
        try {
            const statistics = await StationService.getStationStatistics(req.params.id);
            res.json(statistics);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new StationController(); 