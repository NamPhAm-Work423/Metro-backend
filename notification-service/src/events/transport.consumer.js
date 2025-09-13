const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const TemplateService = require('../services/template.service');
const ticketGrpcClient = require('../grpc/ticket.client');
const userGrpcClient = require('../grpc/user.client');
require('dotenv').config();

/**
 * Transport Event Consumer - Handles transport-related events from other services
 * Follows Single Responsibility Principle - only handles transport event consumption
 */
class TransportEventConsumer {
    constructor(notificationService) {
        this.topics = ['station-events'];
        this.groupId = 'notification-service-transport-consumer';
        this.consumer = null;
        this.templateService = new TemplateService();
        this.notificationService = notificationService;
    }

    /**
     * Initialize and start the consumer
     */
    async start() {
        try {
            this.consumer = new KafkaEventConsumer({
                clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
                brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
                groupId: this.groupId,
                topics: this.topics,
                eachMessage: this.handleMessage.bind(this)
            });

            await this.consumer.start();
            logger.info('Transport event consumer started successfully', {
                topics: this.topics,
                groupId: this.groupId
            });
        } catch (error) {
            logger.error('Failed to start transport event consumer', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Handle incoming messages from Kafka
     * @param {Object} context - Kafka message context
     * @param {Object} context.topic - Topic name
     * @param {Object} context.partition - Partition number
     * @param {Object} context.message - Message object
     */
    async handleMessage({ topic, partition, message }) {
        try {
            const messageValue = message.value?.toString();
            if (!messageValue) {
                logger.warn('Received empty message', { topic, partition });
                return;
            }

            const event = JSON.parse(messageValue);
            logger.info('Received transport event', {
                topic,
                partition,
                eventType: event.type,
                eventId: event.data?.metadata?.eventId
            });

            // Route events based on type
            switch (event.type) {
                case 'STATION_STATUS_CHANGED':
                    await this.handleStationStatusChange(event);
                    break;
                case 'STATION_DEACTIVATED':
                    await this.handleStationDeactivation(event);
                    break;
                default:
                    logger.warn('Unknown event type received', {
                        eventType: event.type,
                        topic
                    });
            }
        } catch (error) {
            logger.error('Failed to handle transport event', {
                topic,
                partition,
                error: error.message,
                stack: error.stack
            });
            // Don't throw error to prevent consumer from stopping
        }
    }

    /**
     * Handle station status change events
     * @param {Object} event - Event object
     */
    async handleStationStatusChange(event) {
        try {
            const { data } = event;
            
            // Only process if status changed from true to false
            if (data.previousStatus === true && data.newStatus === false) {
                logger.info('Station deactivated, sending notifications', {
                    stationId: data.stationId,
                    stationName: data.stationName
                });

                await this.sendStationDeactivationNotifications(data);
            }
        } catch (error) {
            logger.error('Failed to handle station status change', {
                eventId: event.data?.metadata?.eventId,
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Handle station deactivation events
     * @param {Object} event - Event object
     */
    async handleStationDeactivation(event) {
        try {
            const { data } = event;
            
            logger.info('Processing station deactivation event', {
                stationId: data.stationId,
                stationName: data.stationName
            });

            await this.sendStationDeactivationNotifications(data);
        } catch (error) {
            logger.error('Failed to handle station deactivation', {
                eventId: event.data?.metadata?.eventId,
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Send email notifications for station deactivation
     * @param {Object} stationData - Station data from event
     */
    async sendStationDeactivationNotifications(stationData) {
        try {
            // Get list of users who need to be notified
            // Pass affected routes information for better targeting
            const usersToNotify = await this.getUsersToNotifyForStationDeactivation(
                stationData.stationId, 
                stationData.affectedRoutes || []
            );
            
            if (usersToNotify.length === 0) {
                logger.info('No users to notify for station deactivation', {
                    stationId: stationData.stationId,
                    affectedRoutesCount: stationData.affectedRoutes?.length || 0
                });
                return;
            }

            // Create email notifications for each user
            const emailPromises = usersToNotify.map(user => 
                this.createStationDeactivationEmail(user, stationData)
            );

            const results = await Promise.allSettled(emailPromises);
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            logger.info('Station deactivation email notifications processed', {
                stationId: stationData.stationId,
                affectedRoutesCount: stationData.affectedRoutes?.length || 0,
                totalUsers: usersToNotify.length,
                successful,
                failed
            });
        } catch (error) {
            logger.error('Failed to send station deactivation email notifications', {
                stationId: stationData.stationId,
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Get users who should be notified about station deactivation
     * @param {string} stationId - Station ID
     * @param {Array} affectedRoutes - Array of affected routes
     * @returns {Array} Array of user objects
     */
    async getUsersToNotifyForStationDeactivation(stationId, affectedRoutes = []) {
        try {
            logger.info('Starting user retrieval for station deactivation notification', {
                stationId,
                affectedRoutesCount: affectedRoutes.length
            });

            // Step 1: Extract route IDs from affected routes
            const routeIds = affectedRoutes.map(route => route.routeId);
            
            if (routeIds.length === 0) {
                logger.warn('No affected routes found for station deactivation', { stationId });
                return [];
            }

            // Step 2: Get tickets that contain any of the affected routes
            const ticketsResponse = await ticketGrpcClient.getTicketsByRoutes(
                routeIds, 
                ['active', 'inactive']
            );

            const tickets = ticketsResponse.tickets || [];
            logger.info('Retrieved tickets from ticket service', {
                ticketCount: tickets.length,
                routeIds
            });

            if (tickets.length === 0) {
                logger.info('No tickets found for affected routes', { routeIds });
                return [];
            }

            // Step 3: Filter tickets that actually contain the affected routes in fareBreakdown
            const relevantTickets = tickets.filter(ticket => {
                logger.debug('Checking ticket for route matching', {
                    ticketId: ticket.ticketId,
                    passengerId: ticket.passengerId,
                    hasFareBreakdown: !!ticket.fareBreakdown,
                    routeIds,
                    fareBreakdown: ticket.fareBreakdown ? {
                        hasSegmentFares: !!ticket.fareBreakdown.segmentFares,
                        segmentFaresCount: ticket.fareBreakdown.segmentFares?.length || 0,
                        segmentFares: ticket.fareBreakdown.segmentFares?.map(s => ({ routeId: s.routeId })) || [],
                        hasJourneyDetails: !!ticket.fareBreakdown.journeyDetails,
                        hasRouteSegments: !!ticket.fareBreakdown.journeyDetails?.routeSegments,
                        routeSegmentsCount: ticket.fareBreakdown.journeyDetails?.routeSegments?.length || 0,
                        routeSegments: ticket.fareBreakdown.journeyDetails?.routeSegments?.map(s => ({ routeId: s.routeId })) || []
                    } : null
                });
                
                if (!ticket.fareBreakdown) return false;
                
                const result = ticketGrpcClient.ticketContainsRoutes(ticket.fareBreakdown, routeIds);
                logger.debug('Ticket route matching result', {
                    ticketId: ticket.ticketId,
                    passengerId: ticket.passengerId,
                    isMatch: result
                });
                
                return result;
            });

            logger.info('Filtered relevant tickets', {
                totalTickets: tickets.length,
                relevantTickets: relevantTickets.length
            });

            // Step 4: Extract unique passenger IDs
            const uniquePassengerIds = ticketGrpcClient.extractUniquePassengerIds(relevantTickets);
            
            if (uniquePassengerIds.length === 0) {
                logger.info('No unique passenger IDs found', { stationId });
                return [];
            }

            logger.info('Extracted unique passenger IDs', {
                uniquePassengerCount: uniquePassengerIds.length
            });

            // Step 5: Get passenger email information via gRPC
            const passengersResponse = await userGrpcClient.getPassengerEmails(uniquePassengerIds);
            const passengers = passengersResponse.passengers || [];

            logger.info('Retrieved passenger emails', {
                passengerCount: passengers.length
            });

            // Step 6: Filter passengers with email notifications enabled
            const emailEnabledPassengers = userGrpcClient.filterEmailEnabledPassengers(passengers);
            
            // Step 7: Convert to user objects for email
            const users = userGrpcClient.convertPassengersToUsers(emailEnabledPassengers);

            logger.info('Final user list for station deactivation notification', {
                stationId,
                affectedRoutesCount: affectedRoutes.length,
                totalTickets: tickets.length,
                relevantTickets: relevantTickets.length,
                uniquePassengers: uniquePassengerIds.length,
                totalPassengers: passengers.length,
                emailEnabledPassengers: emailEnabledPassengers.length,
                finalUsersCount: users.length
            });

            return users;
        } catch (error) {
            logger.error('Failed to get users for station deactivation notification', {
                stationId,
                affectedRoutesCount: affectedRoutes?.length || 0,
                error: error.message,
                stack: error.stack
            });
            
            // Return empty array on error to prevent SMS sending failure
            return [];
        }
    }

    /**
     * Create email notification for station deactivation
     * @param {Object} user - User object
     * @param {Object} stationData - Station data
     * @returns {Object} Email record
     */
    async createStationDeactivationEmail(user, stationData) {
        try {
            const templateData = {
                stationName: stationData.stationName,
                location: stationData.location,
                reason: stationData.reason || 'Bảo trì hệ thống',
                affectedRoutes: stationData.affectedRoutes || []
            };
            
            // Send email via notification service
            const result = await this.notificationService.sendEmail({
                to: user.email,
                subject: `🚨 Thông báo tạm ngừng hoạt động ga ${stationData.stationName}`,
                template: 'transport_template/station_deactivation',
                variables: templateData,
                userId: user.userId,
                category: 'station_alert'
            });
            
            logger.info('Station deactivation email sent', {
                emailId: result.id,
                userId: user.userId,
                stationId: stationData.stationId,
                email: user.email,
                status: result.status
            });

            return result;
        } catch (error) {
            logger.error('Failed to send station deactivation email', {
                userId: user.userId,
                stationId: stationData.stationId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Stop the consumer
     */
    async stop() {
        if (this.consumer) {
            await this.consumer.stop();
            logger.info('Transport event consumer stopped');
        }
    }
}

module.exports = TransportEventConsumer;
