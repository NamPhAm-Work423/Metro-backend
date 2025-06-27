const routeStationService = require('../services/routeStation.service');

class RouteStationController {
    async createRouteStation(req, res) {
        try {
            const routeStation = await routeStationService.createRouteStation(req.body);
            res.status(201).json({
                success: true,
                message: 'RouteStation created successfully',
                data: routeStation
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllRouteStations(req, res) {
        try {
            const routeStations = await routeStationService.getAllRouteStations(req.query);
            res.status(200).json({
                success: true,
                data: routeStations
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getRouteStationById(req, res) {
        try {
            const routeStation = await routeStationService.getRouteStationById(req.params.id);
            res.status(200).json({
                success: true,
                data: routeStation
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateRouteStation(req, res) {
        try {
            const routeStation = await routeStationService.updateRouteStation(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'RouteStation updated successfully',
                data: routeStation
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteRouteStation(req, res) {
        try {
            await routeStationService.deleteRouteStation(req.params.id);
            res.status(200).json({
                success: true,
                message: 'RouteStation deleted successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getStationsByRoute(req, res) {
        try {
            const stations = await routeStationService.getStationsByRoute(req.params.routeId);
            res.status(200).json({
                success: true,
                data: stations
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getRoutesByStation(req, res) {
        try {
            const routes = await routeStationService.getRoutesByStation(req.params.stationId);
            res.status(200).json({
                success: true,
                data: routes
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async setupCompleteRoute(req, res) {
        try {
            const { routeId } = req.params;
            const { stationSequences } = req.body;
            const result = await routeStationService.setupCompleteRoute(routeId, stationSequences);
            res.status(200).json({
                success: true,
                message: result.message,
                data: result.routeStations
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getRoutePathWithDetails(req, res) {
        try {
            const routePath = await routeStationService.getRoutePathWithDetails(req.params.routeId);
            res.status(200).json({
                success: true,
                data: routePath
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async findRoutesBetweenTwoStations(req, res) {
        try {
            const { originStationId, destinationStationId } = req.query;
            const routes = await routeStationService.findRoutesBetweenTwoStations(originStationId, destinationStationId);
            res.status(200).json({
                success: true,
                data: routes
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async validateRouteSequence(req, res) {
        try {
            const validation = await routeStationService.validateRouteSequence(req.params.routeId);
            res.status(200).json({
                success: true,
                data: validation
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async reorderRouteStations(req, res) {
        try {
            const { routeId } = req.params;
            const { newSequences } = req.body;
            const result = await routeStationService.reorderRouteStations(routeId, newSequences);
            res.status(200).json({
                success: true,
                message: result.message,
                data: result.validation
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new RouteStationController(); 