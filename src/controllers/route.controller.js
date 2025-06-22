const RouteService = require('../services/route.service');

class RouteController {
    async createRoute(req, res) {
        try {
            const route = await RouteService.createRoute(req.body);
            res.status(201).json(route);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getRouteById(req, res) {
        try {
            const route = await RouteService.getRouteById(req.params.id);
            if (!route) {
                return res.status(404).json({ message: 'Route not found' });
            }
            res.json(route);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAllRoutes(req, res) {
        try {
            const routes = await RouteService.getAllRoutes(req.query);
            res.json(routes);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateRoute(req, res) {
        try {
            const route = await RouteService.updateRoute(req.params.id, req.body);
            if (!route) {
                return res.status(404).json({ message: 'Route not found' });
            }
            res.json(route);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async deleteRoute(req, res) {
        try {
            const route = await RouteService.deleteRoute(req.params.id);
            if (!route) {
                return res.status(404).json({ message: 'Route not found' });
            }
            res.json({ message: 'Route deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getRouteStations(req, res) {
        try {
            const stations = await RouteService.getRouteStations(req.params.id);
            res.json(stations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getRouteSchedule(req, res) {
        try {
            const schedule = await RouteService.getRouteSchedule(req.params.id);
            res.json(schedule);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async calculateRouteDistance(req, res) {
        try {
            const distance = await RouteService.calculateRouteDistance(req.params.id);
            res.json({ distance });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getRouteFare(req, res) {
        try {
            const fare = await RouteService.getRouteFare(req.params.id);
            res.json(fare);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getRouteStatistics(req, res) {
        try {
            const statistics = await RouteService.getRouteStatistics(req.params.id);
            res.json(statistics);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new RouteController(); 