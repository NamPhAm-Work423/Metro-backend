const Route = require('../models/route.model');
const { AppError } = require('../middlewares/errorHandler');

class RouteService {
    async createRoute(routeData) {
        try {
            const route = new Route(routeData);
            await route.save();
            return route;
        } catch (error) {
            throw new AppError('Error creating route', 500);
        }
    }

    async getRouteById(id) {
        try {
            const route = await Route.findById(id)
                .populate('stations')
                .populate('schedules');
            if (!route) {
                throw new AppError('Route not found', 404);
            }
            return route;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error finding route', 500);
        }
    }

    async getAllRoutes() {
        try {
            const routes = await Route.find()
                .populate('stations')
                .populate('schedules');
            return routes;
        } catch (error) {
            throw new AppError('Error fetching routes', 500);
        }
    }

    async updateRoute(id, updateData) {
        try {
            const route = await Route.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate('stations')
             .populate('schedules');
            if (!route) {
                throw new AppError('Route not found', 404);
            }
            return route;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error updating route', 500);
        }
    }

    async deleteRoute(id) {
        try {
            const route = await Route.findByIdAndDelete(id);
            if (!route) {
                throw new AppError('Route not found', 404);
            }
            return route;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error deleting route', 500);
        }
    }

    async getRoutesByStation(stationId) {
        try {
            const routes = await Route.find({ stations: stationId })
                .populate('stations')
                .populate('schedules');
            return routes;
        } catch (error) {
            throw new AppError('Error fetching station routes', 500);
        }
    }

    async getRoutesByType(type) {
        try {
            const routes = await Route.find({ type })
                .populate('stations')
                .populate('schedules');
            return routes;
        } catch (error) {
            throw new AppError('Error fetching routes by type', 500);
        }
    }

    async getRouteStats() {
        try {
            const totalRoutes = await Route.countDocuments();
            const activeRoutes = await Route.countDocuments({ status: 'active' });
            const routesByType = await Route.aggregate([
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]);

            return {
                totalRoutes,
                activeRoutes,
                routesByType
            };
        } catch (error) {
            throw new AppError('Error fetching route statistics', 500);
        }
    }
}

module.exports = new RouteService(); 