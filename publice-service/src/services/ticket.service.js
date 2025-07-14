const axios = require('axios');
const { logger } = require('../config/logger');
const { config } = require('../config');

class TicketService {
    constructor() {
        this.baseURL = config.services.ticket.url;
        this.timeout = config.services.ticket.timeout;
        this.retries = config.services.ticket.retries;
        this.retryDelayMs = config.services.ticket.retryDelayMs;
        
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
                this.client.get('/v1/fares')
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
                this.client.get('/v1/fares', {
                    params: { routeId }
                })
            );

            const fares = response.data;
            logger.info('Successfully fetched fares for route', { 
                routeId,
                count: Array.isArray(fares) ? fares.length : 0 
            });

            return fares;
        } catch (error) {
            logger.error('Failed to fetch fares for route from ticket service', {
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
            // Note: Based on the ticket service models, transit passes might be fetched via a different endpoint
            // We'll try multiple possible endpoints to get transit pass data
            
            let transitPasses = [];
            
            // Try to fetch directly from transit passes endpoint if available
            try {
                const response = await this.retryCall(() => 
                    this.client.get('/v1/transit-passes')
                );
                transitPasses = response.data;
            } catch (directError) {
                // If direct endpoint doesn't exist, try to get from a general endpoint
                logger.warn('Direct transit passes endpoint not found, trying alternative');
                
                try {
                    // Try tickets endpoint with pass type filter
                    const response = await this.retryCall(() => 
                        this.client.get('/v1/tickets', {
                            params: { 
                                ticketType: 'day_pass,weekly_pass,monthly_pass,yearly_pass,lifetime_pass' 
                            }
                        })
                    );
                    
                    // Extract unique transit pass information from tickets
                    const tickets = response.data;
                    const passTypes = new Set();
                    
                    if (Array.isArray(tickets)) {
                        tickets.forEach(ticket => {
                            if (ticket.ticketType && ticket.ticketType.includes('_pass')) {
                                passTypes.add(ticket.ticketType);
                            }
                        });
                    }
                    
                    // Create transit pass objects from unique types found
                    transitPasses = Array.from(passTypes).map(type => ({
                        transitPassType: type,
                        // Extract other relevant information from tickets if available
                        sampleTicket: tickets.find(t => t.ticketType === type)
                    }));
                    
                } catch (alternativeError) {
                    logger.warn('Alternative transit pass fetch also failed', {
                        error: alternativeError.message
                    });
                    
                    // Return default transit pass types if we can't fetch from service
                    transitPasses = [
                        { transitPassType: 'day_pass', price: null, currency: 'VND', isActive: true },
                        { transitPassType: 'weekly_pass', price: null, currency: 'VND', isActive: true },
                        { transitPassType: 'monthly_pass', price: null, currency: 'VND', isActive: true },
                        { transitPassType: 'yearly_pass', price: null, currency: 'VND', isActive: true },
                        { transitPassType: 'lifetime_pass', price: null, currency: 'VND', isActive: true }
                    ];
                    
                    logger.info('Using default transit pass types due to fetch failure');
                }
            }

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
     * Fetch specific transit pass by type
     */
    async fetchTransitPassByType(passType) {
        logger.info('Fetching transit pass by type', { passType });
        
        try {
            // Try to fetch specific pass type
            let transitPass = null;
            
            try {
                const response = await this.retryCall(() => 
                    this.client.get(`/v1/transit-passes/${passType}`)
                );
                transitPass = response.data;
            } catch (directError) {
                // If direct endpoint doesn't exist, get from all passes and filter
                const allPasses = await this.fetchAllTransitPasses();
                transitPass = Array.isArray(allPasses) 
                    ? allPasses.find(pass => pass.transitPassType === passType)
                    : null;
            }

            if (transitPass) {
                logger.info('Successfully fetched transit pass', { passType });
            } else {
                logger.warn('Transit pass not found', { passType });
            }

            return transitPass;
        } catch (error) {
            logger.error('Failed to fetch transit pass from ticket service', {
                passType,
                error: error.message,
                status: error.response?.status
            });
            throw new Error(`Failed to fetch transit pass ${passType}: ${error.message}`);
        }
    }

    /**
     * Fetch all ticket data (fares and transit passes) in parallel
     */
    async fetchAllTicketData() {
        logger.info('Fetching all ticket data');
        
        try {
            const [fares, transitPasses] = await Promise.all([
                this.fetchAllFares(),
                this.fetchAllTransitPasses()
            ]);

            const data = {
                fares,
                transitPasses,
                fetchedAt: new Date().toISOString()
            };

            logger.info('Successfully fetched all ticket data', {
                faresCount: Array.isArray(fares) ? fares.length : 0,
                transitPassesCount: Array.isArray(transitPasses) ? transitPasses.length : 0
            });

            return data;
        } catch (error) {
            logger.error('Failed to fetch ticket data', { error: error.message });
            throw error;
        }
    }

    /**
     * Check ticket service health
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

module.exports = TicketService; 