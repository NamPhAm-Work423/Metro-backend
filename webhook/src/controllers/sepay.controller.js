const SepayWebhookService = require('../services/sepayWebhook.service');
const { logger } = require('../config/logger');
const { defaultRateLimiter } = require('../middlewares/rateLimiter');

/**
 * Sepay Webhook Controller
 * Handles HTTP requests for Sepay webhooks
 * Implements Single Responsibility Principle (SRP)
 */
class SepayController {
    constructor() {
        this.webhookService = new SepayWebhookService();
    }

    /**
     * Handle Sepay webhook endpoint
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async handleWebhook(req, res) {
        const startTime = Date.now();
        const requestId = req.headers['x-request-id'] || `sepay-${Date.now()}`;

        try {
            logger.info('Sepay webhook received', {
                requestId,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                contentLength: req.headers['content-length'],
                eventType: req.body?.event_type,
                webhookId: req.body?.id
            });

            // Validate request body
            if (!req.body || !req.body.id || !req.body.event_type) {
                logger.warn('Invalid Sepay webhook request body', {
                    requestId,
                    hasBody: !!req.body,
                    hasId: !!req.body?.id,
                    hasEventType: !!req.body?.event_type
                });

                return res.status(400).json({
                    success: false,
                    error: 'INVALID_WEBHOOK_PAYLOAD',
                    message: 'Invalid webhook payload structure',
                    requestId
                });
            }

            // Validate event structure before processing
            const isValidStructure = this.webhookService.validateEventStructure(req.body);
            if (!isValidStructure) {
                logger.warn('Sepay webhook structure validation failed', {
                    requestId,
                    eventType: req.body.event_type,
                    webhookId: req.body.id
                });

                return res.status(400).json({
                    success: false,
                    error: 'INVALID_EVENT_STRUCTURE',
                    message: 'Webhook event structure validation failed',
                    requestId
                });
            }

            // Prepare webhook data for processing
            const webhookData = {
                eventData: req.body,
                headers: req.headers,
                sourceIp: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            };

            // Process webhook
            const result = await this.webhookService.processWebhook(webhookData);

            const processingTime = Date.now() - startTime;

            logger.info('Sepay webhook processing completed', {
                requestId,
                webhookId: req.body.id,
                eventType: req.body.event_type,
                status: result.status,
                success: result.success,
                processingTime,
                eventsPublished: result.eventsPublished || 0
            });

            // Return appropriate response based on result
            if (result.success) {
                const responseData = {
                    success: true,
                    status: result.status,
                    message: this.getStatusMessage(result.status),
                    webhookId: result.webhookId,
                    requestId,
                    processingTime
                };

                // Add additional data for non-duplicate responses
                if (result.status !== 'duplicate') {
                    responseData.eventsPublished = result.eventsPublished;
                    responseData.signatureVerified = result.signatureVerified;
                }

                return res.status(200).json(responseData);
            } else {
                return res.status(422).json({
                    success: false,
                    status: result.status,
                    error: 'WEBHOOK_PROCESSING_FAILED',
                    message: result.error || 'Webhook processing failed',
                    webhookId: result.webhookId,
                    requestId,
                    processingTime
                });
            }

        } catch (error) {
            const processingTime = Date.now() - startTime;

            logger.error('Sepay webhook controller error', {
                requestId,
                error: error.message,
                stack: error.stack,
                eventType: req.body?.event_type,
                webhookId: req.body?.id,
                processingTime
            });

            return res.status(500).json({
                success: false,
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Internal server error while processing webhook',
                requestId,
                processingTime
            });
        }
    }

    /**
     * Get Sepay webhook statistics
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getStatistics(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();

            const statistics = await this.webhookService.getStatistics(start, end);

            logger.info('Sepay webhook statistics requested', {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                ip: req.ip
            });

            return res.status(200).json({
                success: true,
                data: {
                    period: {
                        startDate: start.toISOString(),
                        endDate: end.toISOString()
                    },
                    statistics
                }
            });

        } catch (error) {
            logger.error('Failed to get Sepay webhook statistics', {
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            return res.status(500).json({
                success: false,
                error: 'STATISTICS_ERROR',
                message: 'Failed to retrieve webhook statistics'
            });
        }
    }

    /**
     * Retry failed Sepay webhooks
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async retryFailedWebhooks(req, res) {
        try {
            const { limit = 10 } = req.query;
            const retryLimit = Math.min(parseInt(limit), 50); // Max 50 retries per request

            logger.info('Sepay webhook retry requested', {
                limit: retryLimit,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            const results = await this.webhookService.retryFailedWebhooks(retryLimit);

            const summary = {
                total: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
            };

            logger.info('Sepay webhook retry completed', {
                summary,
                ip: req.ip
            });

            return res.status(200).json({
                success: true,
                message: 'Webhook retry completed',
                summary,
                results
            });

        } catch (error) {
            logger.error('Failed to retry Sepay webhooks', {
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            return res.status(500).json({
                success: false,
                error: 'RETRY_ERROR',
                message: 'Failed to retry failed webhooks'
            });
        }
    }

    /**
     * Health check for Sepay webhook endpoint
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async healthCheck(req, res) {
        try {
            const health = {
                service: 'sepay-webhook',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0'
            };

            return res.status(200).json(health);

        } catch (error) {
            logger.error('Sepay webhook health check failed', {
                error: error.message
            });

            return res.status(503).json({
                service: 'sepay-webhook',
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Get user-friendly status message
     * @param {string} status - Processing status
     * @returns {string} - Status message
     */
    getStatusMessage(status) {
        const messages = {
            'processed': 'Webhook processed successfully',
            'duplicate': 'Webhook already processed (duplicate)',
            'failed': 'Webhook processing failed',
            'processing': 'Webhook is being processed'
        };

        return messages[status] || 'Unknown status';
    }

    /**
     * Middleware to validate Sepay webhook headers
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    validateSepayHeaders(req, res, next) {
        const requiredHeaders = [
            'sepay-signature',
            'sepay-timestamp'
        ];

        const missingHeaders = requiredHeaders.filter(header => !req.headers[header]);

        if (missingHeaders.length > 0) {
            logger.warn('Missing Sepay webhook headers', {
                missingHeaders,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(400).json({
                success: false,
                error: 'MISSING_SEPAY_HEADERS',
                message: 'Required Sepay webhook headers are missing',
                missingHeaders
            });
        }

        next();
    }

    /**
     * Raw body parser middleware for Sepay webhooks
     * Sepay requires the raw body for signature verification
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    parseRawBody(req, res, next) {
        if (req.headers['content-type'] === 'application/json') {
            let data = '';
            
            req.on('data', chunk => {
                data += chunk;
            });

            req.on('end', () => {
                try {
                    req.rawBody = data;
                    req.body = JSON.parse(data);
                    next();
                } catch (error) {
                    logger.error('Failed to parse Sepay webhook body', {
                        error: error.message,
                        contentType: req.headers['content-type'],
                        contentLength: req.headers['content-length']
                    });

                    return res.status(400).json({
                        success: false,
                        error: 'INVALID_JSON',
                        message: 'Invalid JSON in request body'
                    });
                }
            });
        } else {
            next();
        }
    }
}

// Create singleton instance
const sepayController = new SepayController();

module.exports = {
    handleWebhook: sepayController.handleWebhook.bind(sepayController),
    getStatistics: sepayController.getStatistics.bind(sepayController),
    retryFailedWebhooks: sepayController.retryFailedWebhooks.bind(sepayController),
    healthCheck: sepayController.healthCheck.bind(sepayController),
    validateSepayHeaders: sepayController.validateSepayHeaders.bind(sepayController),
    parseRawBody: sepayController.parseRawBody.bind(sepayController)
};


