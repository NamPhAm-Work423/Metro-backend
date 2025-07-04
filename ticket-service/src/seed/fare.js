const { v4: uuidv4 } = require('uuid');
const { Fare } = require('../models/index.model');
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

                // One-way fare
                routeFares.push({
                    fareId: uuidv4(),
                    routeId: route.routeId,
                    ticketType: 'oneway',
                    basePrice,
                    currency: 'VND',
                    isActive: true
                });

                // Return fare (1.5x one-way)
                routeFares.push({
                    fareId: uuidv4(),
                    routeId: route.routeId,
                    ticketType: 'return',
                    basePrice: basePrice * 1.5,
                    currency: 'VND',
                    isActive: true
                });

                logger.info(`Created fares for route ${route.name} (stations: ${stationCount})`);
            } catch (error) {
                logger.error(`Error creating fare for route ${route.routeId}:`, error);
            }
        }

        // System-wide passes (not route specific)
        const systemPasses = [
            {
                fareId: uuidv4(),
                routeId: null,
                ticketType: 'day_pass',
                longTermPrice: 50000,
                currency: 'VND',
                isActive: true
            },
            {
                fareId: uuidv4(),
                routeId: null,
                ticketType: 'weekly_pass',
                longTermPrice: 200000,
                currency: 'VND',
                isActive: true
            },
            {
                fareId: uuidv4(),
                routeId: null,
                ticketType: 'monthly_pass',
                longTermPrice: 750000,
                currency: 'VND',
                isActive: true
            },
            {
                fareId: uuidv4(),
                routeId: null,
                ticketType: 'yearly_pass',
                longTermPrice: 8000000,
                currency: 'VND',
                isActive: true
            }
        ];

        // Combine route fares and system passes
        const allFares = [...routeFares, ...systemPasses];

        // Bulk create fares
        await Fare.bulkCreate(allFares, {
            updateOnDuplicate: ['basePrice', 'longTermPrice', 'isActive', 'updatedAt']
        });

        logger.info(`✅ Seeded ${routeFares.length} route fares and ${systemPasses.length} system passes`);
    } catch (error) {
        logger.error('❌ Error seeding fares:', error);
        throw error;
    }
};

module.exports = seedFares;
