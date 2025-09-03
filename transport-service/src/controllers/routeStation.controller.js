const routeStationService = require('../services/routeStation.service');

class RouteStationController {
    async createRouteStation(req, res, next) {
        try {
            const routeStation = await routeStationService.createRouteStation(req.body);
            return res.status(201).json({
                success: true,
                message: 'RouteStation created successfully',
                data: routeStation
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CREATE_ROUTE_STATION'
            });
        }
    }

    async getAllRouteStations(req, res, next) {
        try {
            const routeStations = await routeStationService.getAllRouteStations(req.query);
            return res.status(200).json({
                success: true,
                message: 'RouteStations fetched successfully',
                data: routeStations
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ALL_ROUTE_STATIONS'
            });
        }
    }

    async getRouteStationById(req, res, next) {
        try {
            const routeStation = await routeStationService.getRouteStationById(req.params.id);
            return res.status(200).json({
                success: true,
                message: 'RouteStation fetched successfully',
                data: routeStation
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(404).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ROUTE_STATION_BY_ID'
            });
        }
    }

    async updateRouteStation(req, res, next) {
        try {
            const routeStation = await routeStationService.updateRouteStation(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: 'RouteStation updated successfully',
                data: routeStation
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_UPDATE_ROUTE_STATION'
            });
        }
    }

    async deleteRouteStation(req, res, next) {
        try {
            await routeStationService.deleteRouteStation(req.params.id);
            return res.status(200).json({
                success: true,
                message: 'RouteStation deleted successfully',
                error: 'INTERNAL_ERROR_DELETE_ROUTE_STATION'
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_DELETE_ROUTE_STATION'
            });
        }
    }

    async getStationsByRoute(req, res, next) {
        try {
            const stations = await routeStationService.getStationsByRoute(req.params.routeId);
            return res.status(200).json({
                success: true,
                message: 'Stations fetched by route successfully',
                data: stations
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_STATIONS_BY_ROUTE'
            });
        }
    }

    async getRoutesByStation(req, res, next) {
        try {
            const routes = await routeStationService.getRoutesByStation(req.params.stationId);
            return res.status(200).json({
                success: true,
                message: 'Routes fetched by station successfully',
                data: routes
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ROUTES_BY_STATION'
            });
        }
    }

    async setupCompleteRoute(req, res, next) {
        try {
            const { routeId } = req.params;
            const { stationSequences } = req.body;
            const result = await routeStationService.setupCompleteRoute(routeId, stationSequences);
            return res.status(200).json({
                success: true,
                message: result.message,
                data: result.routeStations
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_SETUP_COMPLETE_ROUTE'
            });
        }
    }

    async getRoutePathWithDetails(req, res, next) {
        try {
            const routePath = await routeStationService.getRoutePathWithDetails(req.params.routeId);
            return res.status(200).json({
                success: true,
                data: routePath
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ROUTE_PATH_WITH_DETAILS'
            });
        }
    }

    async findRoutesBetweenTwoStations(req, res, next) {
        try {
            const { originStationId, destinationStationId } = req.query;
            const routes = await routeStationService.findRoutesBetweenTwoStations(originStationId, destinationStationId);
            return res.status(200).json({
                success: true,
                data: routes
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_FIND_ROUTES_BETWEEN_TWO_STATIONS'
            });
        }
    }

    async validateRouteSequence(req, res, next) {
        try {
            const validation = await routeStationService.validateRouteSequence(req.params.routeId);
            return res.status(200).json({
                success: true,
                data: validation
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_VALIDATE_ROUTE_SEQUENCE'
            });
        }
    }

    async reorderRouteStations(req, res, next) {
        try {
            const { routeId } = req.params;
            const { newSequences } = req.body;
            const result = await routeStationService.reorderRouteStations(routeId, newSequences);
            return res.status(200).json({
                success: true,
                message: result.message,
                data: result.validation
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_REORDER_ROUTE_STATIONS'
            });
        }
    }
}

module.exports = new RouteStationController(); 