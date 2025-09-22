const axios = require('axios');
const { logger } = require('../config/logger');
const CacheService = require('./cache.service');

class TransportService {
    constructor() {
        this.baseURL = process.env.TRANSPORT_SERVICE_URL || 'http://transport-service:8000';
        this.timeout = parseInt(process.env.TRANSPORT_TIMEOUT) || 5000;
        this.retries = parseInt(process.env.TRANSPORT_RETRIES) || 3;
        this.retryDelayMs = parseInt(process.env.TRANSPORT_RETRY_DELAY) || 1000;
        
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
        this.cacheService = new CacheService();
    }

    /**
     * Setup axios interceptors for logging and error handling
     */
    setupInterceptors() {
        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                logger.debug('Transport service request', {
                    method: config.method,
                    url: config.url,
                    params: config.params
                });
                return config;
            },
            (error) => {
                logger.error('Transport service request error', { error: error.message });
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                logger.debug('Transport service response', {
                    status: response.status,
                    url: response.config.url,
                    dataLength: response.data ? JSON.stringify(response.data).length : 0
                });
                return response;
            },
            (error) => {
                logger.error('Transport service response error', {
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
                logger.warn(`Transport service call failed (attempt ${attempt}/${retries})`, {
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
     * Fetch all routes from transport service
     */
    async fetchAllRoutes() {
        logger.info('Fetching all routes from transport service');
        
        try {
            const response = await this.retryCall(() => 
                this.client.get('/api/v1/transport/route')
            );

            const routes = response.data;
            logger.info('Successfully fetched routes', { 
                count: Array.isArray(routes) ? routes.length : 0 
            });

            return routes;
        } catch (error) {
            logger.error('Failed to fetch routes from transport service', {
                error: error.message,
                status: error.response?.status,
                url: error.config?.url
            });
            throw new Error(`Failed to fetch routes: ${error.message}`);
        }
    }

    /**
     * Fetch specific route by ID
     */
    async fetchRouteById(routeId) {
        logger.info('Fetching route by ID', { routeId });
        
        try {
            const response = await this.retryCall(() => 
                this.client.get(`/api/v1/transport/route/${routeId}`)
            );

            const route = response.data;
            logger.info('Successfully fetched route', { routeId });

            return route;
        } catch (error) {
            logger.error('Failed to fetch route from transport service', {
                routeId,
                error: error.message,
                status: error.response?.status
            });
            throw new Error(`Failed to fetch route ${routeId}: ${error.message}`);
        }
    }

    /**
     * Fetch all stations from transport service
     */
    async fetchAllStations() {
        logger.info('Fetching all stations from transport service');
        
        try {
            const response = await this.retryCall(() => 
                this.client.get('/api/v1/transport/station')
            );

            const stations = response.data;
            logger.info('Successfully fetched stations', { 
                count: Array.isArray(stations) ? stations.length : 0 
            });

            return stations;
        } catch (error) {
            logger.error('Failed to fetch stations from transport service', {
                error: error.message,
                status: error.response?.status,
                url: error.config?.url
            });
            throw new Error(`Failed to fetch stations: ${error.message}`);
        }
    }

    /**
     * Fetch specific station by ID
     */
    async fetchStationById(stationId) {
        logger.info('Fetching station by ID', { stationId });
        
        try {
            const response = await this.retryCall(() => 
                this.client.get(`/api/v1/transport/station/${stationId}`)
            );

            const station = response.data;
            logger.info('Successfully fetched station', { stationId });

            return station;
        } catch (error) {
            logger.error('Failed to fetch station from transport service', {
                stationId,
                error: error.message,
                status: error.response?.status
            });
            throw new Error(`Failed to fetch station ${stationId}: ${error.message}`);
        }
    }

    /**
     * Fetch stations for a specific route
     */
    async fetchRouteStations(routeId) {
        logger.info('Fetching stations for route', { routeId });
        
        try {
            const response = await this.retryCall(() => 
                this.client.get(`/api/v1/transport/route/${routeId}/stations`)
            );

            const stations = response.data;
            logger.info('Successfully fetched route stations', { 
                routeId,
                count: Array.isArray(stations) ? stations.length : 0 
            });

            return stations;
        } catch (error) {
            logger.error('Failed to fetch route stations from transport service', {
                routeId,
                error: error.message,
                status: error.response?.status
            });
            throw new Error(`Failed to fetch stations for route ${routeId}: ${error.message}`);
        }
    }

    /**
     * Fetch all route-station relationships
     */
    async fetchAllRouteStations() {
        logger.info('Fetching all route-station relationships');
        
        try {
            const response = await this.retryCall(() => 
                this.client.get('/api/v1/transport/route-station')
            );

            const routeStations = response.data;
            logger.info('Successfully fetched route-station relationships', { 
                count: Array.isArray(routeStations) ? routeStations.length : 0 
            });

            return routeStations;
        } catch (error) {
            logger.error('Failed to fetch route-station relationships', {
                error: error.message,
                status: error.response?.status,
                url: error.config?.url
            });
            throw new Error(`Failed to fetch route-station relationships: ${error.message}`);
        }
    }

    /**
     * Search routes between origin and destination
     */
    async searchRoutes(origin, destination) {
        logger.info('Searching routes', { origin, destination });
        
        try {
            const response = await this.retryCall(() => 
                this.client.get('/api/v1/transport/route/search', {
                    params: { origin, destination }
                })
            );

            const routes = response.data;
            logger.info('Successfully searched routes', { 
                origin,
                destination,
                count: Array.isArray(routes) ? routes.length : 0 
            });

            return routes;
        } catch (error) {
            logger.error('Failed to search routes', {
                origin,
                destination,
                error: error.message,
                status: error.response?.status
            });
            throw new Error(`Failed to search routes: ${error.message}`);
        }
    }

    /**
     * Health check for transport service
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health', { timeout: 8000 });
            return {
                status: 'healthy',
                service: 'transport-service',
                response: response.data,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'transport-service',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Convenience: get trips for next N days via cached gRPC
     */
    async getTripsNextDays({ startDate, days = 7, routeId } = {}) {
        try {
            return await this.cacheService.getTripsNextDays({ startDate, days, routeId });
        } catch (error) {
            logger.error('Failed to get trips next days (cached)', { error: error.message });
            throw error;
        }
    }
}

module.exports = TransportService; 