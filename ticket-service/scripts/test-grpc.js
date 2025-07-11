require('dotenv').config();
const TransportClient = require('../src/grpc/transportClient');
const { logger } = require('../src/config/logger');
const sequelize = require('../src/config/database');

async function testTransportGrpc() {
    try {
        console.log('🔄 Testing gRPC connection to transport service...');
        console.log(`🔗 Using URL: ${process.env.TRANSPORT_GRPC_URL || 'localhost:50051'}`);

        // Test database connection first
        await sequelize.authenticate();
        console.log('✅ Database connection successful');

        // Test transport service connectivity
        const isReady = await TransportClient.isTransportServiceReady();
        
        if (isReady) {
            console.log('✅ Transport service is accessible');
            
            // Try to get all routes
            const routesResponse = await TransportClient.getAllRoutes();
            console.log('📋 Routes found:', routesResponse?.routes?.length || 0);
            
            if (routesResponse?.routes?.length > 0) {
                console.log('First route:', routesResponse.routes[0]);
            }
            
            // Try to seed fares
            console.log('🌱 Attempting to seed fares...');
            const seedFares = require('../src/seed/fare');
            await seedFares();
            console.log('✅ Fare seeding completed successfully');
            
        } else {
            console.log('❌ Transport service is not accessible');
            console.log('🔄 Creating fallback fares instead...');
            
            const { Fare } = require('../src/models/index.model');
            const { v4: uuidv4 } = require('uuid');
            
            const fallbackFares = [
                {
                    fareId: uuidv4(),
                    routeId: '00000000-0000-0000-0000-000000000001',
                    basePrice: 12000,
                    currency: 'VND',
                    isActive: true
                }
            ];
            
            await Fare.bulkCreate(fallbackFares);
            console.log('✅ Fallback fares created');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

testTransportGrpc(); 