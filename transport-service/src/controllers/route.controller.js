const routeService = require('../services/route.service');

class RouteController {
    async createRoute(req, res, next) {
        try {
            const route = await routeService.createRoute(req.body);
            return res.status(201).json({
                success: true,
                message: 'Route created successfully',
                data: route
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CREATE_ROUTE'
            });
        }
    }

    async getAllRoutes(req, res, next) {
        try {
            const routes = await routeService.getAllRoutes(req.query);
            return res.status(200).json({
                success: true,
                message: 'Routes fetched successfully',
                data: routes
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ALL_ROUTES'
            });
        }
    }

    async getRouteById(req, res, next) {
        try {
            const route = await routeService.getRouteById(req.params.id);
            return res.status(200).json({
                success: true,
                message: 'Route fetched successfully',
                data: route
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(404).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ROUTE_BY_ID'
            });
        }
    }

    async updateRoute(req, res, next) {
        try {
            const route = await routeService.updateRoute(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: 'Route updated successfully',
                data: route
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_UPDATE_ROUTE'
            });
        }
    }

    async deleteRoute(req, res, next) {
        try {
            await routeService.deleteRoute(req.params.id);
            return res.status(200).json({
                success: true,
                message: 'Route deactivated successfully',
                error: 'INTERNAL_ERROR_DELETE_ROUTE'
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_DELETE_ROUTE'
            });
        }
    }

    async getActiveRoutes(req, res, next) {
        try {
            const routes = await routeService.getActiveRoutes();
            return res.status(200).json({
                success: true,
                message: 'Active routes fetched successfully',
                data: routes
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ACTIVE_ROUTES'
            });
        }
    }

    async getRoutesByStation(req, res, next) {
        try {
            const routes = await routeService.getRoutesByStation(req.params.stationId);
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

    async findRoutesBetweenStations(req, res, next) {
        try {
            const { originId, destinationId } = req.query;
            const routes = await routeService.findRoutesBetweenStations(originId, destinationId);
            return res.status(200).json({
                success: true,
                message: 'Routes fetched between stations successfully',
                data: routes
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_FIND_ROUTES_BETWEEN_STATIONS'
            });
        }
    }

    async calculateRouteDistance(req, res, next) {
        try {
            const distance = await routeService.calculateRouteDistance(req.params.id);
            return res.status(200).json({
                success: true,
                message: 'Route distance calculated successfully',
                data: distance
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CALCULATE_ROUTE_DISTANCE'
            });
        }
    }
}

module.exports = new RouteController(); 