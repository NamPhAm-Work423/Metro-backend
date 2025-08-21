const { logger } = require('../config/logger');
const { SMS } = require('../models');
const { Op } = require('sequelize');

/**
 * SMS Controller - handles SMS notification management and monitoring
 * Follows SOLID principles with single responsibility for SMS operations
 */
class SMSController {
    /**
     * Get paginated list of SMS notifications with filters
     * GET /admin/sms
     */
    async getSMS(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                provider,
                recipient,
                category,
                template,
                countryCode,
                startDate,
                endDate,
                search
            } = req.query;

            // Build where clause with filters
            const whereClause = {};

            if (status) whereClause.status = status;
            if (provider) whereClause.provider = provider;
            if (category) whereClause.category = category;
            if (template) whereClause.template = template;
            if (countryCode) whereClause.countryCode = countryCode;
            
            if (recipient) {
                whereClause.toPhoneNumber = { [Op.iLike]: `%${recipient}%` };
            }

            // Date range filter
            if (startDate && endDate) {
                whereClause.sentAt = {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                };
            } else if (startDate) {
                whereClause.sentAt = { [Op.gte]: new Date(startDate) };
            } else if (endDate) {
                whereClause.sentAt = { [Op.lte]: new Date(endDate) };
            }

            // Search in text content or phone number
            if (search) {
                whereClause[Op.or] = [
                    { textContent: { [Op.iLike]: `%${search}%` } },
                    { toPhoneNumber: { [Op.iLike]: `%${search}%` } }
                ];
            }

            const offset = (parseInt(page) - 1) * parseInt(limit);

            const { count, rows } = await SMS.findAndCountAll({
                where: whereClause,
                order: [['sentAt', 'DESC']],
                limit: parseInt(limit),
                offset,
                attributes: [
                    'id', 'provider', 'toPhoneNumber', 'fromSenderId',
                    'textContent', 'template', 'status', 'category', 'priority',
                    'sentAt', 'deliveredAt', 'errorMessage', 'providerMessageId',
                    'messageLength', 'segmentCount', 'cost', 'currency', 'countryCode'
                ]
            });

            const totalPages = Math.ceil(count / parseInt(limit));

            logger.info('Admin SMS list fetched', {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                filters: { status, provider, recipient, category, template, countryCode, search }
            });

            res.json({
                success: true,
                data: {
                    sms: rows,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalItems: count,
                        itemsPerPage: parseInt(limit),
                        hasNext: parseInt(page) < totalPages,
                        hasPrev: parseInt(page) > 1
                    },
                    filters: {
                        status,
                        provider,
                        recipient,
                        category,
                        template,
                        countryCode,
                        search,
                        startDate,
                        endDate
                    }
                }
            });
        } catch (error) {
            logger.error('Failed to fetch SMS', {
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch SMS',
                error: error.message
            });
        }
    }

    /**
     * Get SMS details by ID
     * GET /admin/sms/:id
     */
    async getSMSById(req, res) {
        try {
            const { id } = req.params;

            const sms = await SMS.findByPk(id);

            if (!sms) {
                return res.status(404).json({
                    success: false,
                    message: 'SMS not found'
                });
            }

            logger.info('Admin SMS details fetched', { smsId: id });

            res.json({
                success: true,
                data: sms
            });
        } catch (error) {
            logger.error('Failed to fetch SMS details', {
                smsId: req.params.id,
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch SMS details',
                error: error.message
            });
        }
    }

    /**
     * Get SMS statistics
     * GET /admin/sms/stats
     */
    async getSMSStats(req, res) {
        try {
            const { startDate, endDate, period = '7d' } = req.query;

            let start, end;
            if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(endDate);
            } else {
                // Default periods
                end = new Date();
                start = new Date();
                switch (period) {
                    case '1d':
                        start.setDate(start.getDate() - 1);
                        break;
                    case '7d':
                        start.setDate(start.getDate() - 7);
                        break;
                    case '30d':
                        start.setDate(start.getDate() - 30);
                        break;
                    case '90d':
                        start.setDate(start.getDate() - 90);
                        break;
                    default:
                        start.setDate(start.getDate() - 7);
                }
            }

            const stats = await SMS.getStats(start, end);

            logger.info('Admin SMS stats fetched', {
                period: { start, end },
                totalSMS: stats.total
            });

            res.json({
                success: true,
                data: {
                    period: { start, end },
                    channel: 'sms',
                    overview: {
                        total: stats.total,
                        successRate: stats.successRate
                    },
                    ...stats
                }
            });
        } catch (error) {
            logger.error('Failed to fetch SMS stats', {
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch SMS statistics',
                error: error.message
            });
        }
    }

    /**
     * Get SMS by recipient
     * GET /admin/sms/recipient/:recipient
     */
    async getSMSByRecipient(req, res) {
        try {
            const { recipient } = req.params;
            const { limit = 50 } = req.query;

            const sms = await SMS.findByRecipient(recipient, {
                limit: parseInt(limit),
                attributes: [
                    'id', 'provider', 'textContent', 'template', 'status',
                    'category', 'sentAt', 'deliveredAt', 'errorMessage', 'cost'
                ]
            });

            logger.info('Admin SMS by recipient fetched', {
                recipient,
                count: sms.length
            });

            res.json({
                success: true,
                data: {
                    recipient,
                    sms,
                    count: sms.length,
                    channel: 'sms'
                }
            });
        } catch (error) {
            logger.error('Failed to fetch SMS by recipient', {
                recipient: req.params.recipient,
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch SMS by recipient',
                error: error.message
            });
        }
    }

    /**
     * Retry failed SMS
     * POST /admin/sms/:id/retry
     */
    async retrySMS(req, res) {
        try {
            const { id } = req.params;

            const sms = await SMS.findByPk(id);

            if (!sms) {
                return res.status(404).json({
                    success: false,
                    message: 'SMS not found'
                });
            }

            if (sms.status !== 'failed') {
                return res.status(400).json({
                    success: false,
                    message: 'Only failed SMS can be retried'
                });
            }

            // TODO: Implement retry logic by republishing to Kafka
            // For now, just mark as queued
            sms.status = 'queued';
            sms.errorMessage = null;
            await sms.save();

            logger.info('SMS marked for retry', { smsId: id });

            res.json({
                success: true,
                message: 'SMS marked for retry',
                data: sms
            });
        } catch (error) {
            logger.error('Failed to retry SMS', {
                smsId: req.params.id,
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to retry SMS',
                error: error.message
            });
        }
    }

    /**
     * Get SMS delivery timeline
     * GET /admin/sms/:id/timeline
     */
    async getSMSTimeline(req, res) {
        try {
            const { id } = req.params;

            const sms = await SMS.findByPk(id, {
                attributes: [
                    'id', 'status', 'sentAt', 'deliveredAt',
                    'createdAt', 'updatedAt'
                ]
            });

            if (!sms) {
                return res.status(404).json({
                    success: false,
                    message: 'SMS not found'
                });
            }

            // Build timeline events
            const timeline = [
                {
                    event: 'created',
                    timestamp: sms.createdAt,
                    status: 'queued'
                },
                {
                    event: 'sent',
                    timestamp: sms.sentAt,
                    status: sms.status
                }
            ];

            if (sms.deliveredAt) {
                timeline.push({
                    event: 'delivered',
                    timestamp: sms.deliveredAt,
                    status: 'delivered'
                });
            }

            res.json({
                success: true,
                data: {
                    smsId: id,
                    currentStatus: sms.status,
                    timeline: timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                }
            });
        } catch (error) {
            logger.error('Failed to fetch SMS timeline', {
                smsId: req.params.id,
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch SMS timeline',
                error: error.message
            });
        }
    }

    /**
     * Get SMS cost analysis
     * GET /admin/sms/costs
     */
    async getSMSCosts(req, res) {
        try {
            const { startDate, endDate, period = '7d', groupBy = 'day' } = req.query;

            let start, end;
            if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(endDate);
            } else {
                end = new Date();
                start = new Date();
                switch (period) {
                    case '1d':
                        start.setDate(start.getDate() - 1);
                        break;
                    case '7d':
                        start.setDate(start.getDate() - 7);
                        break;
                    case '30d':
                        start.setDate(start.getDate() - 30);
                        break;
                    default:
                        start.setDate(start.getDate() - 7);
                }
            }

            const stats = await SMS.getStats(start, end);

            res.json({
                success: true,
                data: {
                    period: { start, end },
                    costs: stats.costs,
                    totalSMS: stats.total,
                    costPerMessage: stats.total > 0 ? (stats.costs.total / stats.total).toFixed(4) : 0
                }
            });
        } catch (error) {
            logger.error('Failed to fetch SMS costs', {
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch SMS costs',
                error: error.message
            });
        }
    }
}

module.exports = new SMSController();
