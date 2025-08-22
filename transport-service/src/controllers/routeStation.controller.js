const routeStationService = require('../services/routeStation.service');

class RouteStationController {
    async createRouteStation(req, res, next) {
        try {
            const routeStation = await routeStationService.createRouteStation(req.body);
            res.status(201).json({
                success: true,
                message: 'RouteStation created successfully',
                data: routeStation
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllRouteStations(req, res, next) {
        try {
            const routeStations = await routeStationService.getAllRouteStations(req.query);
            res.status(200).json({
                success: true,
                data: routeStations
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getRouteStationById(req, res, next) {
        try {
            const routeStation = await routeStationService.getRouteStationById(req.params.id);
            res.status(200).json({
                success: true,
                data: routeStation
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateRouteStation(req, res, next) {
        try {
            const routeStation = await routeStationService.updateRouteStation(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'RouteStation updated successfully',
                data: routeStation
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteRouteStation(req, res, next) {
        try {
            await routeStationService.deleteRouteStation(req.params.id);
            res.status(200).json({
                success: true,
                message: 'RouteStation deleted successfully'
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getStationsByRoute(req, res, next) {
        try {
            const stations = await routeStationService.getStationsByRoute(req.params.routeId);
            res.status(200).json({
                success: true,
                data: stations
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getRoutesByStation(req, res, next) {
        try {
            const routes = await routeStationService.getRoutesByStation(req.params.stationId);
            res.status(200).json({
                success: true,
                data: routes
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async setupCompleteRoute(req, res, next) {
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
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getRoutePathWithDetails(req, res, next) {
        try {
            const routePath = await routeStationService.getRoutePathWithDetails(req.params.routeId);
            res.status(200).json({
                success: true,
                data: routePath
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async findRoutesBetweenTwoStations(req, res, next) {
        try {
            const { originStationId, destinationStationId } = req.query;
            const routes = await routeStationService.findRoutesBetweenTwoStations(originStationId, destinationStationId);
            res.status(200).json({
                success: true,
                data: routes
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async validateRouteSequence(req, res, next) {
        try {
            const validation = await routeStationService.validateRouteSequence(req.params.routeId);
            res.status(200).json({
                success: true,
                data: validation
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async reorderRouteStations(req, res, next) {
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
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new RouteStationController(); 