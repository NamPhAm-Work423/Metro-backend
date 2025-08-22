const routeService = require('../services/route.service');

class RouteController {
    async createRoute(req, res, next) {
        try {
            const route = await routeService.createRoute(req.body);
            res.status(201).json({
                success: true,
                message: 'Route created successfully',
                data: route
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllRoutes(req, res, next) {
        try {
            const routes = await routeService.getAllRoutes(req.query);
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

    async getRouteById(req, res, next) {
        try {
            const route = await routeService.getRouteById(req.params.id);
            res.status(200).json({
                success: true,
                data: route
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateRoute(req, res, next) {
        try {
            const route = await routeService.updateRoute(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Route updated successfully',
                data: route
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteRoute(req, res, next) {
        try {
            await routeService.deleteRoute(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Route deactivated successfully'
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getActiveRoutes(req, res, next) {
        try {
            const routes = await routeService.getActiveRoutes();
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

    async getRoutesByStation(req, res, next) {
        try {
            const routes = await routeService.getRoutesByStation(req.params.stationId);
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

    async findRoutesBetweenStations(req, res, next) {
        try {
            const { originId, destinationId } = req.query;
            const routes = await routeService.findRoutesBetweenStations(originId, destinationId);
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

    async calculateRouteDistance(req, res, next) {
        try {
            const distance = await routeService.calculateRouteDistance(req.params.id);
            res.status(200).json({
                success: true,
                data: distance
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new RouteController(); 