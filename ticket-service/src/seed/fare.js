const { v4: uuidv4 } = require('uuid');
const { Fare, TransitPass } = require('../models/index.model');
const TransportClient = require('../grpc/transportClient');
const { logger } = require('../config/logger');

const seedFares = async () => {
    try {
        // Fetch all routes via gRPC
        const allRoutesResponse = await TransportClient.getAllRoutes();
        const allRoutes = (allRoutesResponse && allRoutesResponse.routes) ? allRoutesResponse.routes : [];

        let routeFares = [];

        for (const route of allRoutes) {
            try {
                // Get station count for the route to determine pricing tier
                const routeStationsResponse = await TransportClient.getRouteStations(route.routeId);
                const stationCount = (routeStationsResponse && routeStationsResponse.routeStations) ? routeStationsResponse.routeStations.length : 0;

                // Calculate base price using business rule
                let basePrice = 10000; // default
                if (stationCount > 0) {
                    if (stationCount <= 5) basePrice = 10000;
                    else if (stationCount <= 10) basePrice = 12000;
                    else if (stationCount <= 15) basePrice = 14000;
                    else if (stationCount <= 20) basePrice = 16000;
                    else if (stationCount <= 25) basePrice = 18000;
                    else basePrice = 20000;
                }

                // Route-based fare for one-way tickets
                routeFares.push({
                    fareId: uuidv4(),
                    routeId: route.routeId,
                    basePrice,
                    currency: 'VND',
                    isActive: true
                });

                logger.info(`Created fares for route ${route.name} (stations: ${stationCount})`);
            } catch (error) {
                logger.error(`Error creating fare for route ${route.routeId}:`, error);
            }
        }

        // Create route-based fares
        await Fare.bulkCreate(routeFares, {
            updateOnDuplicate: ['basePrice', 'isActive', 'updatedAt']
        });

        // System-wide transit passes (separate model)
        const transitPasses = [
            {
                transitPassId: uuidv4(),
                transitPassType: 'day_pass',
                price: 50000,
                currency: 'VND'
            },
            {
                transitPassId: uuidv4(),
                transitPassType: 'weekly_pass',
                price: 200000,
                currency: 'VND'
            },
            {
                transitPassId: uuidv4(),
                transitPassType: 'monthly_pass',
                price: 750000,
                currency: 'VND'
            },
            {
                transitPassId: uuidv4(),
                transitPassType: 'yearly_pass',
                price: 8000000,
                currency: 'VND'
            }
        ];

        // Create transit passes
        await TransitPass.bulkCreate(transitPasses, {
            updateOnDuplicate: ['price', 'updatedAt']
        });

        logger.info(`Seeded ${routeFares.length} route fares and ${transitPasses.length} system passes`);
    } catch (error) {
        logger.error('Error seeding fares:', error);
        throw error;
    }
};

module.exports = seedFares;
