const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

/**
 * User Service gRPC Client
 * Handles communication with user-service via gRPC
 */
class UserGrpcClient {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    /**
     * Initialize gRPC client
     */
    async initialize() {
        try {
            const PROTO_PATH = path.join(__dirname, '../proto/user.proto');
            
            const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true
            });

            const userProto = grpc.loadPackageDefinition(packageDefinition).user;
            
            const userServiceUrl = process.env.USER_SERVICE_GRPC_URL || 'localhost:50052';
            
            this.client = new userProto.UserService(
                userServiceUrl,
                grpc.credentials.createInsecure()
            );

            this.initialized = true;
            logger.info('User gRPC client initialized successfully', {
                serviceUrl: userServiceUrl
            });
        } catch (error) {
            logger.error('Failed to initialize User gRPC client', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Ensure client is initialized
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    /**
     * Get passengers by IDs
     * @param {Array<string>} passengerIds - Array of passenger IDs
     * @returns {Promise<Object>} Passengers response
     */
    async getPassengersByIds(passengerIds) {
        try {
            await this.ensureInitialized();

            const request = {
                passengerIds: passengerIds
            };

            logger.debug('Calling getPassengersByIds gRPC', {
                passengerCount: passengerIds.length
            });

            return new Promise((resolve, reject) => {
                this.client.getPassengersByIds(request, (error, response) => {
                    if (error) {
                        logger.error('gRPC getPassengersByIds failed', {
                            error: error.message,
                            code: error.code,
                            details: error.details
                        });
                        reject(error);
                    } else {
                        logger.debug('gRPC getPassengersByIds success', {
                            passengerCount: response.passengers?.length || 0
                        });
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            logger.error('Failed to call getPassengersByIds', {
                error: error.message,
                passengerIdsCount: passengerIds.length
            });
            throw error;
        }
    }

    /**
     * Get passenger phone numbers by IDs
     * @param {Array<string>} passengerIds - Array of passenger IDs
     * @returns {Promise<Object>} Phone numbers response
     */
    async getPassengerPhoneNumbers(passengerIds) {
        try {
            await this.ensureInitialized();

            const request = {
                passengerIds: passengerIds
            };

            logger.debug('Calling getPassengerPhoneNumbers gRPC', {
                passengerCount: passengerIds.length
            });

            return new Promise((resolve, reject) => {
                this.client.getPassengerPhoneNumbers(request, (error, response) => {
                    if (error) {
                        logger.error('gRPC getPassengerPhoneNumbers failed', {
                            error: error.message,
                            code: error.code,
                            details: error.details
                        });
                        reject(error);
                    } else {
                        logger.debug('gRPC getPassengerPhoneNumbers success', {
                            contactCount: response.contacts?.length || 0
                        });
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            logger.error('Failed to call getPassengerPhoneNumbers', {
                error: error.message,
                passengerIdsCount: passengerIds.length
            });
            throw error;
        }
    }

    /**
     * Get passenger email addresses by IDs
     * @param {Array<string>} passengerIds - Array of passenger IDs
     * @returns {Promise<Object>} Email addresses response
     */
    async getPassengerEmails(passengerIds) {
        try {
            await this.ensureInitialized();

            const request = {
                passengerIds: passengerIds
            };

            logger.debug('Calling getPassengersByIds gRPC for emails', {
                passengerCount: passengerIds.length
            });

            return new Promise((resolve, reject) => {
                this.client.getPassengersByIds(request, (error, response) => {
                    if (error) {
                        logger.error('gRPC getPassengersByIds failed', {
                            error: error.message,
                            code: error.code,
                            details: error.details
                        });
                        reject(error);
                    } else {
                        logger.debug('gRPC getPassengersByIds success', {
                            passengerCount: response.passengers?.length || 0
                        });
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            logger.error('Failed to call getPassengersByIds for emails', {
                error: error.message,
                passengerIdsCount: passengerIds.length
            });
            throw error;
        }
    }

    /**
     * Convert gRPC passenger contacts to user objects for SMS
     * @param {Array} contacts - gRPC contacts response
     * @returns {Array} User objects for SMS
     */
    convertContactsToUsers(contacts) {
        return contacts.map(contact => ({
            userId: contact.passengerId,
            phoneNumber: contact.phoneNumber,
            name: contact.name,
            preferences: {
                smsNotifications: contact.preferences?.smsNotifications ?? true,
                stationAlerts: contact.preferences?.stationAlerts ?? true
            }
        }));
    }

    /**
     * Convert gRPC passenger info to user objects for email
     * @param {Array} passengers - gRPC passengers response
     * @returns {Array} User objects for email
     */
    convertPassengersToUsers(passengers) {
        return passengers.map(passenger => ({
            userId: passenger.passengerId,
            email: passenger.email,
            name: passenger.name,
            preferences: {
                emailNotifications: passenger.preferences?.emailNotifications ?? true,
                stationAlerts: passenger.preferences?.stationAlerts ?? true
            }
        }));
    }

    /**
     * Filter contacts that have SMS notifications enabled
     * @param {Array} contacts - Array of contacts
     * @returns {Array} Filtered contacts
     */
    filterSmsEnabledContacts(contacts) {
        return contacts.filter(contact => {
            const hasPhoneNumber = contact.phoneNumber && contact.phoneNumber.trim() !== '';
            const smsEnabled = contact.preferences?.smsNotifications !== false;
            const stationAlertsEnabled = contact.preferences?.stationAlerts !== false;
            
            return hasPhoneNumber && smsEnabled && stationAlertsEnabled;
        });
    }

    /**
     * Filter passengers that have email notifications enabled
     * @param {Array} passengers - Array of passengers
     * @returns {Array} Filtered passengers
     */
    filterEmailEnabledPassengers(passengers) {
        return passengers.filter(passenger => {
            const hasEmail = passenger.email && passenger.email.trim() !== '';
            const emailEnabled = passenger.preferences?.emailNotifications !== false;
            const stationAlertsEnabled = passenger.preferences?.stationAlerts !== false;
            
            return hasEmail && emailEnabled && stationAlertsEnabled;
        });
    }

    /**
     * Filter passengers to only include those with SMS enabled
     * @param {Array} contacts - Array of contact objects
     * @returns {Array} Array of SMS-enabled contacts
     */
    filterSmsEnabledContacts(contacts) {
        if (!contacts || !Array.isArray(contacts)) {
            return [];
        }

        return contacts.filter(contact => {
            return contact.smsEnabled === true;
        });
    }

    /**
     * Convert contact objects to user objects for SMS notifications
     * @param {Array} contacts - Array of contact objects
     * @returns {Array} Array of user objects
     */
    convertContactsToUsers(contacts) {
        if (!contacts || !Array.isArray(contacts)) {
            return [];
        }

        return contacts.map(contact => ({
            passengerId: contact.passengerId,
            phoneNumber: contact.phoneNumber,
            name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
        }));
    }

    /**
     * Filter passengers to only include those with email enabled
     * @param {Array} passengers - Array of passenger objects
     * @returns {Array} Array of email-enabled passengers
     */
    filterEmailEnabledPassengers(passengers) {
        if (!passengers || !Array.isArray(passengers)) {
            return [];
        }

        return passengers.filter(passenger => {
            return passenger.emailEnabled === true && passenger.email;
        });
    }

    /**
     * Convert passenger objects to user objects for email notifications
     * @param {Array} passengers - Array of passenger objects
     * @returns {Array} Array of user objects
     */
    convertPassengersToUsers(passengers) {
        if (!passengers || !Array.isArray(passengers)) {
            return [];
        }

        return passengers.map(passenger => ({
            userId: passenger.passengerId,
            email: passenger.email,
            name: passenger.name || `${passenger.firstName || ''} ${passenger.lastName || ''}`.trim()
        }));
    }

    /**
     * Close gRPC client connection
     */
    close() {
        if (this.client) {
            this.client.close();
            this.initialized = false;
            logger.info('User gRPC client closed');
        }
    }
}

module.exports = new UserGrpcClient();
