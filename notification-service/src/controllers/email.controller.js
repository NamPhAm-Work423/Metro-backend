const { logger } = require('../config/logger');
const { Email } = require('../models');
const { Op } = require('sequelize');

/**
 * Email Controller - handles email notification management and monitoring
 * Follows SOLID principles with single responsibility for email operations
 */
class EmailController {
    /**
     * Get paginated list of email notifications with filters
     * GET /admin/emails
     */
    async getEmails(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                provider,
                recipient,
                category,
                template,
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
            
            if (recipient) {
                whereClause.toEmail = { [Op.iLike]: `%${recipient}%` };
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

            // Search in subject or recipient
            if (search) {
                whereClause[Op.or] = [
                    { subject: { [Op.iLike]: `%${search}%` } },
                    { toEmail: { [Op.iLike]: `%${search}%` } }
                ];
            }

            const offset = (parseInt(page) - 1) * parseInt(limit);

            const { count, rows } = await Email.findAndCountAll({
                where: whereClause,
                order: [['sentAt', 'DESC']],
                limit: parseInt(limit),
                offset,
                attributes: [
                    'id', 'provider', 'toEmail', 'fromEmail', 'subject',
                    'template', 'status', 'category', 'priority',
                    'sentAt', 'deliveredAt', 'openedAt', 'errorMessage', 
                    'providerMessageId', 'hasAttachments'
                ]
            });

            const totalPages = Math.ceil(count / parseInt(limit));

            logger.info('Admin emails list fetched', {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                filters: { status, provider, recipient, category, template, search }
            });

            res.json({
                success: true,
                data: {
                    emails: rows,
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
                        search,
                        startDate,
                        endDate
                    }
                }
            });
        } catch (error) {
            logger.error('Failed to fetch emails', {
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch emails',
                error: error.message
            });
        }
    }

    /**
     * Get email details by ID
     * GET /admin/emails/:id
     */
    async getEmailById(req, res) {
        try {
            const { id } = req.params;

            const email = await Email.findByPk(id);

            if (!email) {
                return res.status(404).json({
                    success: false,
                    message: 'Email not found'
                });
            }

            logger.info('Admin email details fetched', { emailId: id });

            res.json({
                success: true,
                data: email
            });
        } catch (error) {
            logger.error('Failed to fetch email details', {
                emailId: req.params.id,
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch email details',
                error: error.message
            });
        }
    }

    /**
     * Get email statistics
     * GET /admin/emails/stats
     */
    async getEmailStats(req, res) {
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

            const stats = await Email.getStats(start, end);

            logger.info('Admin email stats fetched', {
                period: { start, end },
                totalEmails: stats.total
            });

            res.json({
                success: true,
                data: {
                    period: { start, end },
                    channel: 'email',
                    overview: {
                        total: stats.total,
                        successRate: stats.successRate
                    },
                    ...stats
                }
            });
        } catch (error) {
            logger.error('Failed to fetch email stats', {
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch email statistics',
                error: error.message
            });
        }
    }

    /**
     * Get emails by recipient
     * GET /admin/emails/recipient/:recipient
     */
    async getEmailsByRecipient(req, res) {
        try {
            const { recipient } = req.params;
            const { limit = 50 } = req.query;

            const emails = await Email.findByRecipient(recipient, {
                limit: parseInt(limit),
                attributes: [
                    'id', 'provider', 'subject', 'template', 'status',
                    'category', 'sentAt', 'deliveredAt', 'openedAt', 'errorMessage'
                ]
            });

            logger.info('Admin emails by recipient fetched', {
                recipient,
                count: emails.length
            });

            res.json({
                success: true,
                data: {
                    recipient,
                    emails,
                    count: emails.length,
                    channel: 'email'
                }
            });
        } catch (error) {
            logger.error('Failed to fetch emails by recipient', {
                recipient: req.params.recipient,
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch emails by recipient',
                error: error.message
            });
        }
    }

    /**
     * Retry failed email
     * POST /admin/emails/:id/retry
     */
    async retryEmail(req, res) {
        try {
            const { id } = req.params;

            const email = await Email.findByPk(id);

            if (!email) {
                return res.status(404).json({
                    success: false,
                    message: 'Email not found'
                });
            }

            if (email.status !== 'failed') {
                return res.status(400).json({
                    success: false,
                    message: 'Only failed emails can be retried'
                });
            }

            // TODO: Implement retry logic by republishing to Kafka
            // For now, just mark as queued
            email.status = 'queued';
            email.errorMessage = null;
            await email.save();

            logger.info('Email marked for retry', { emailId: id });

            res.json({
                success: true,
                message: 'Email marked for retry',
                data: email
            });
        } catch (error) {
            logger.error('Failed to retry email', {
                emailId: req.params.id,
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to retry email',
                error: error.message
            });
        }
    }

    /**
     * Get email delivery timeline
     * GET /admin/emails/:id/timeline
     */
    async getEmailTimeline(req, res) {
        try {
            const { id } = req.params;

            const email = await Email.findByPk(id, {
                attributes: [
                    'id', 'status', 'sentAt', 'deliveredAt', 'openedAt',
                    'createdAt', 'updatedAt'
                ]
            });

            if (!email) {
                return res.status(404).json({
                    success: false,
                    message: 'Email not found'
                });
            }

            // Build timeline events
            const timeline = [
                {
                    event: 'created',
                    timestamp: email.createdAt,
                    status: 'queued'
                },
                {
                    event: 'sent',
                    timestamp: email.sentAt,
                    status: email.status
                }
            ];

            if (email.deliveredAt) {
                timeline.push({
                    event: 'delivered',
                    timestamp: email.deliveredAt,
                    status: 'delivered'
                });
            }

            if (email.openedAt) {
                timeline.push({
                    event: 'opened',
                    timestamp: email.openedAt,
                    status: 'opened'
                });
            }

            res.json({
                success: true,
                data: {
                    emailId: id,
                    currentStatus: email.status,
                    timeline: timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                }
            });
        } catch (error) {
            logger.error('Failed to fetch email timeline', {
                emailId: req.params.id,
                error: error.message,
                stack: error.stack
            });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch email timeline',
                error: error.message
            });
        }
    }
}

module.exports = new EmailController();
