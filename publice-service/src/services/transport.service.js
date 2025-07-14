const axios = require('axios');
const { logger } = require('../config/logger');
const { config } = require('../config');

class TransportService {
    constructor() {
        this.baseURL = config.services.transport.url;
        this.timeout = config.services.transport.timeout;
        this.retries = config.services.transport.retries;
        this.retryDelayMs = config.services.transport.retryDelayMs;
        
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
                this.client.get('/v1/routes')
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
                this.client.get(`/v1/routes/${routeId}`)
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
                this.client.get('/v1/stations')
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
                this.client.get(`/v1/stations/${stationId}`)
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
                this.client.get(`/v1/routes/${routeId}/stations`)
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
                this.client.get('/v1/route-stations')
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
     * Fetch all transport data in parallel
     */
    async fetchAllTransportData() {
        logger.info('Fetching all transport data');
        
        try {
            const [routes, stations, routeStations] = await Promise.all([
                this.fetchAllRoutes(),
                this.fetchAllStations(),
                this.fetchAllRouteStations()
            ]);

            const data = {
                routes,
                stations,
                routeStations,
                fetchedAt: new Date().toISOString()
            };

            logger.info('Successfully fetched all transport data', {
                routesCount: Array.isArray(routes) ? routes.length : 0,
                stationsCount: Array.isArray(stations) ? stations.length : 0,
                routeStationsCount: Array.isArray(routeStations) ? routeStations.length : 0
            });

            return data;
        } catch (error) {
            logger.error('Failed to fetch transport data', { error: error.message });
            throw error;
        }
    }

    /**
     * Check transport service health
     */
    async checkHealth() {
        try {
            const response = await this.client.get('/health', { timeout: 5000 });
            return {
                status: 'healthy',
                responseTime: response.headers['x-response-time'] || 'unknown',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get service configuration for debugging
     */
    getConfig() {
        return {
            baseURL: this.baseURL,
            timeout: this.timeout,
            retries: this.retries,
            retryDelayMs: this.retryDelayMs
        };
    }
}

module.exports = TransportService; 