const { logger } = require('../config/logger');
const { callTicket } = require('../grpc/publicClient');

class FareGrpcService {
    constructor() {
        logger.info('FareGrpcService initialized - using publicClient');
    }

    /**
     * Fetch all ticket data via gRPC
     */
    async fetchAllTicketData() {
        try {
            logger.info('Fetching all ticket data via gRPC');
            
            const [faresResponse, transitPassesResponse] = await Promise.all([
                callTicket('ListFares', {}),
                callTicket('ListTransitPasses', {})
            ]);
            
            return {
                fares: faresResponse.fares || [],
                transitPasses: transitPassesResponse.transitPasses || []
            };
        } catch (error) {
            logger.error('Failed to fetch ticket data via gRPC', { error: error.message });
            throw new Error(`Failed to fetch ticket data: ${error.message}`);
        }
    }

    /**
     * Fetch all fares via gRPC
     */
    async fetchAllFares() {
        try {
            logger.info('Fetching all fares via gRPC');
            
            const response = await callTicket('ListFares', {});
            return response.fares || [];
        } catch (error) {
            logger.error('Failed to fetch fares via gRPC', { error: error.message });
            throw new Error(`Failed to fetch fares: ${error.message}`);
        }
    }

    /**
     * Fetch all transit passes via gRPC
     */
    async fetchAllTransitPasses() {
        try {
            logger.info('Fetching all transit passes via gRPC');
            
            const response = await callTicket('ListTransitPasses', {});
            return response.transitPasses || [];
        } catch (error) {
            logger.error('Failed to fetch transit passes via gRPC', { error: error.message });
            throw new Error(`Failed to fetch transit passes: ${error.message}`);
        }
    }

    /**
     * Fetch specific fare by ID
     */
    async fetchFareById(fareId) {
        try {
            logger.info('Fetching fare by ID via gRPC', { fareId });
            
            const response = await callTicket('GetFare', { fareId });
            return response;
        } catch (error) {
            logger.error('Failed to fetch fare via gRPC', { fareId, error: error.message });
            throw new Error(`Failed to fetch fare ${fareId}: ${error.message}`);
        }
    }

    /**
     * Fetch specific transit pass by ID
     */
    async fetchTransitPassById(transitPassId) {
        try {
            logger.info('Fetching transit pass by ID via gRPC', { transitPassId });
            
            const response = await callTicket('GetTransitPass', { transitPassId });
            return response;
        } catch (error) {
            logger.error('Failed to fetch transit pass via gRPC', { transitPassId, error: error.message });
            throw new Error(`Failed to fetch transit pass ${transitPassId}: ${error.message}`);
        }
    }
}

module.exports = FareGrpcService; 