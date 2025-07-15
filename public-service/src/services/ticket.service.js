const axios = require('axios');
const { logger } = require('../config/logger');

class TicketService {
    constructor() {
        this.baseURL = process.env.TICKET_SERVICE_URL || 'http://ticket-service:3000';
        this.timeout = parseInt(process.env.TICKET_TIMEOUT) || 5000;
        this.retries = parseInt(process.env.TICKET_RETRIES) || 3;
        this.retryDelayMs = parseInt(process.env.TICKET_RETRY_DELAY) || 1000;
        
        // Create axios instance with default configuration
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'public-service/1.0.0'
            }
        });

        this.setupInterceptors();
    }

    /**
     * Setup axios interceptors for logging and error handling
     */
    setupInterceptors() {
        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                logger.debug('Ticket service request', {
                    method: config.method,
                    url: config.url,
                    params: config.params
                });
                return config;
            },
            (error) => {
                logger.error('Ticket service request error', { error: error.message });
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                logger.debug('Ticket service response', {
                    status: response.status,
                    url: response.config.url,
                    dataLength: response.data ? JSON.stringify(response.data).length : 0
                });
                return response;
            },
            (error) => {
                logger.error('Ticket service response error', {
                    status: error.response?.status,
                    url: error.config?.url,
                    message: error.message
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Retry wrapper for API calls
     */
    async retryCall(fn, retries = this.retries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                logger.warn(`Ticket service call failed (attempt ${attempt}/${retries})`, {
                    error: error.message,
                    attempt,
                    retries
                });

                if (attempt === retries) {
                    throw error;
                }

                // Exponential backoff
                const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Fetch all fares from ticket service
     */
    async fetchAllFares() {
        logger.info('Fetching all fares from ticket service');
        
        try {
            const response = await this.retryCall(() => 
                this.client.get('/api/v1/ticket/fares')
            );

            const fares = response.data;
            logger.info('Successfully fetched fares', { 
                count: Array.isArray(fares) ? fares.length : 0 
            });

            return fares;
        } catch (error) {
            logger.error('Failed to fetch fares from ticket service', {
                error: error.message,
                status: error.response?.status,
                url: error.config?.url
            });
            throw new Error(`Failed to fetch fares: ${error.message}`);
        }
    }

    /**
     * Fetch fares for a specific route
     */
    async fetchFaresByRoute(routeId) {
        logger.info('Fetching fares for route', { routeId });
        
        try {
            const response = await this.retryCall(() => 
                this.client.get(`/api/v1/ticket/fares/route/${routeId}`)
            );

            const fares = response.data;
            logger.info('Successfully fetched fares for route', { 
                routeId,
                count: Array.isArray(fares) ? fares.length : 0 
            });

            return fares;
        } catch (error) {
            logger.error('Failed to fetch fares for route', {
                routeId,
                error: error.message,
                status: error.response?.status
            });
            throw new Error(`Failed to fetch fares for route ${routeId}: ${error.message}`);
        }
    }

    /**
     * Fetch all transit passes from ticket service
     */
    async fetchAllTransitPasses() {
        logger.info('Fetching all transit passes from ticket service');
        
        try {
            const response = await this.retryCall(() => 
                this.client.get('/api/v1/ticket/transit-passes')
            );

            const transitPasses = response.data;
            logger.info('Successfully fetched transit passes', { 
                count: Array.isArray(transitPasses) ? transitPasses.length : 0 
            });

            return transitPasses;
        } catch (error) {
            logger.error('Failed to fetch transit passes from ticket service', {
                error: error.message,
                status: error.response?.status,
                url: error.config?.url
            });
            throw new Error(`Failed to fetch transit passes: ${error.message}`);
        }
    }

    /**
     * Fetch transit passes by type
     */
    async fetchTransitPassesByType(type) {
        logger.info('Fetching transit passes by type', { type });
        
        try {
            const response = await this.retryCall(() => 
                this.client.get(`/api/v1/ticket/transit-passes/${type}`)
            );

            const transitPasses = response.data;
            logger.info('Successfully fetched transit passes by type', { 
                type,
                count: Array.isArray(transitPasses) ? transitPasses.length : 0 
            });

            return transitPasses;
        } catch (error) {
            logger.error('Failed to fetch transit passes by type', {
                type,
                error: error.message,
                status: error.response?.status
            });
            throw new Error(`Failed to fetch transit passes by type ${type}: ${error.message}`);
        }
    }

    /**
     * Search fares with filters
     */
    async searchFares(filters) {
        logger.info('Searching fares', { filters });
        
        try {
            const response = await this.retryCall(() => 
                this.client.get('/api/v1/ticket/fares/search', {
                    params: filters
                })
            );

            const fares = response.data;
            logger.info('Successfully searched fares', { 
                filters,
                count: Array.isArray(fares) ? fares.length : 0 
            });

            return fares;
        } catch (error) {
            logger.error('Failed to search fares', {
                filters,
                error: error.message,
                status: error.response?.status
            });
            throw new Error(`Failed to search fares: ${error.message}`);
        }
    }

    /**
     * Calculate fare for a route
     */
    async calculateFare(routeId, options = {}) {
        logger.info('Calculating fare for route', { routeId, options });
        
        try {
            const response = await this.retryCall(() => 
                this.client.get(`/api/v1/ticket/fares/route/${routeId}/calculate`, {
                    params: options
                })
            );

            const calculation = response.data;
            logger.info('Successfully calculated fare', { routeId, calculation });

            return calculation;
        } catch (error) {
            logger.error('Failed to calculate fare', {
                routeId,
                options,
                error: error.message,
                status: error.response?.status
            });
            throw new Error(`Failed to calculate fare for route ${routeId}: ${error.message}`);
        }
    }

    /**
     * Health check for ticket service
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health', { timeout: 3000 });
            return {
                status: 'healthy',
                service: 'ticket-service',
                response: response.data,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'ticket-service',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = TicketService; 