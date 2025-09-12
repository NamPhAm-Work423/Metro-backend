const { logger } = require('../../../config/logger');
const TransportClient = require('../../../grpc/transportClient');
const { getClient } = require('../../../config/redis');

/**
 * Service to enrich ticket data with human-readable information before sending events
 * This follows Single Responsibility Principle - ticket service handles its own data formatting
 */
class TicketDataEnrichmentService {
    /**
     * Fallback station name mapping (used when transport service is unavailable)
     * Primary source is now transport service via gRPC
     */
    static FALLBACK_STATION_NAMES = {
        'BEN_THANH': 'Bến Thành',
        'SUI_TIEN': 'Suối Tiên',
        'SUOI_TIEN': 'Suối Tiên',
        'TAN_DINH': 'Tân Định', 
        'THI_NGHE': 'Thị Nghè',
        'PHU_NHUAN': 'Phú Nhuận',
        'GO_VAP': 'Gò Vấp',
        'AN_DONG': 'An Đông',
        'BA_SON': 'Ba Son',
        'CONG_VIEN_TRAM_HUONG': 'Công Viên Tràm Hương',
        'LANG_CHA_CA': 'Làng Chà Cá',
        'PHU_MY_HUNG': 'Phú Mỹ Hưng',
        'SAIGON_BRIDGE': 'Cầu Sài Gòn',
        'DIAMOND_PLAZA': 'Diamond Plaza',
        'REUNIFICATION_PALACE': 'Dinh Độc Lập',
        'OPERA_HOUSE': 'Nhà Hát Thành Phố',
        'BITEXCO_FINANCIAL_TOWER': 'Bitexco Financial Tower',
        'NGUYEN_HUE_WALKING_STREET': 'Phố Đi Bộ Nguyễn Huệ'
    };

    /**
     * Ticket type localized names
     */
    static TICKET_TYPE_NAMES = {
        'oneway': 'Vé một chiều',
        'return': 'Vé khứ hồi', 
        'day_pass': 'Vé ngày',
        'weekly_pass': 'Vé tuần',
        'monthly_pass': 'Vé tháng',
        'yearly_pass': 'Vé năm',
        'lifetime_pass': 'Vé trọn đời'
    };

    /**
     * Single-use ticket types (one-time use)
     */
    static SINGLE_USE_TICKET_TYPES = ['oneway', 'return'];

    /**
     * Multi-use ticket types (can be used multiple times)
     */
    static MULTI_USE_TICKET_TYPES = ['day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'];

    /**
     * Get human-readable station name from transport service
     * @param {string} stationId - Station identifier
     * @returns {Promise<string>} Localized station name
     */
    static async getStationName(stationId) {
        if (!stationId) {
            return 'Không xác định';
        }

        try {
            // Try to get from cache first
            const cachedName = await this._getStationFromCache(stationId);
            if (cachedName) {
                return cachedName;
            }

            // Call transport service
            const stationInfo = await TransportClient.getStation(stationId);
            
            if (stationInfo && stationInfo.name) {
                // Cache the result
                await this._cacheStationName(stationId, stationInfo.name);
                logger.debug('Retrieved station name from transport service', {
                    stationId,
                    name: stationInfo.name
                });
                return stationInfo.name;
            }

            // Fallback to static mapping if transport service doesn't have the station
            return this._getFallbackStationName(stationId);

        } catch (error) {
            logger.warn('Failed to get station name from transport service, using fallback', {
                stationId,
                error: error.message
            });
            return this._getFallbackStationName(stationId);
        }
    }

    /**
     * Get station names for multiple stations in batch
     * @param {string[]} stationIds - Array of station identifiers
     * @returns {Promise<Map<string, string>>} Map of stationId -> station name
     */
    static async getStationNamesBatch(stationIds) {
        if (!Array.isArray(stationIds) || stationIds.length === 0) {
            return new Map();
        }

        const results = new Map();
        
        // Process stations concurrently but limit concurrency
        const concurrencyLimit = 5;
        const chunks = this._chunkArray(stationIds, concurrencyLimit);

        for (const chunk of chunks) {
            const promises = chunk.map(async (stationId) => {
                const stationName = await this.getStationName(stationId);
                return { stationId, stationName };
            });

            const chunkResults = await Promise.allSettled(promises);
            
            chunkResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.set(result.value.stationId, result.value.stationName);
                } else {
                    const stationId = chunk[index];
                    const fallbackName = this._getFallbackStationName(stationId);
                    results.set(stationId, fallbackName);
                    logger.warn('Failed to get station name in batch', { 
                        stationId,
                        error: result.reason?.message || 'Unknown error'
                    });
                }
            });
        }

        return results;
    }

    /**
     * Get fallback station name from static mapping
     * @private
     */
    static _getFallbackStationName(stationId) {
        const normalized = String(stationId)
            .trim()
            .toUpperCase()
            .replace(/-/g, '_');

        return this.FALLBACK_STATION_NAMES[normalized] || stationId;
    }

    /**
     * Determine if ticket type is single-use or multi-use
     * @param {string} ticketType - Ticket type enum
     * @returns {boolean} True if single-use, false if multi-use
     */
    static isSingleUseTicket(ticketType) {
        const type = String(ticketType || 'oneway').toLowerCase();
        return this.SINGLE_USE_TICKET_TYPES.includes(type);
    }

    /**
     * Determine if ticket type is multi-use
     * @param {string} ticketType - Ticket type enum
     * @returns {boolean} True if multi-use, false if single-use
     */
    static isMultiUseTicket(ticketType) {
        const type = String(ticketType || 'oneway').toLowerCase();
        return this.MULTI_USE_TICKET_TYPES.includes(type);
    }

    /**
     * Get email template name based on ticket type
     * @param {string} ticketType - Ticket type enum
     * @returns {string} Template filename without extension
     */
    static getEmailTemplateName(ticketType) {
        if (this.isSingleUseTicket(ticketType)) {
            return 'singleUseTicketEmail';
        }
        return 'multiUseTicketEmail';
    }

    /**
     * Get localized ticket type name  
     * @param {string} ticketType - Ticket type enum
     * @param {number} totalPassengers - Number of passengers (for context)
     * @returns {string} Localized ticket type name
     */
    static getTicketTypeName(ticketType, totalPassengers = 1) {
        const type = String(ticketType || 'oneway').toLowerCase();
        const baseName = this.TICKET_TYPE_NAMES[type] || this.TICKET_TYPE_NAMES['oneway'];
        
        // Add passenger count context for single tickets
        if (type === 'oneway' && totalPassengers > 1) {
            return `${baseName} (${totalPassengers} hành khách)`;
        }
        
        return baseName;
    }

    /**
     * Format currency amount in VND
     * @param {number|string} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    static formatCurrency(amount) {
        const numAmount = Number(amount) || 0;
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(numAmount);
    }

    /**
     * Format date for Vietnamese locale with UTC+7 timezone
     * @param {string|Date} date - Date to format
     * @returns {string} Formatted date string
     */
    static formatDate(date) {
        if (!date) return new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        return new Date(date).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh'
        });
    }

    /**
     * Format time for Vietnamese locale with UTC+7 timezone
     * @param {string|Date} date - Date to format time from
     * @returns {string} Formatted time string
     */
    static formatTime(date) {
        if (!date) return new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        return new Date(date).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh'
        });
    }

    /**
     * Enrich ticket data with human-readable information for events
     * @param {Object} ticket - Ticket model instance
     * @param {Object} options - Enrichment options
     * @returns {Promise<Object>} Enriched ticket data ready for event publishing
     */
    static async enrichTicketForEvent(ticket, options = {}) {
        try {
            const isMultiUse = this.isMultiUseTicket(ticket.ticketType);
            
            // Extract departure info from QR code if available
            let departureInfo = this.extractDepartureInfoFromQR(ticket.qrCode);
            
            // Fallback to ticket activation date
            if (!departureInfo.date && ticket.activatedAt) {
                departureInfo.date = this.formatDate(ticket.activatedAt);
                departureInfo.time = this.formatTime(ticket.activatedAt);
            }
            
            // Final fallback to current time
            if (!departureInfo.date) {
                const now = new Date();
                departureInfo.date = this.formatDate(now);
                departureInfo.time = this.formatTime(now);
            }

            // Get station names from transport service
            const stationIds = [ticket.originStationId, ticket.destinationStationId].filter(Boolean);
            const stationNames = await this.getStationNamesBatch(stationIds);
            
            const enrichedData = {
                ticketId: ticket.ticketId,
                passengerId: ticket.passengerId,
                qrCode: ticket.qrCode,
                totalPrice: ticket.totalPrice,
                totalPassengers: ticket.totalPassengers || 1,
                originStationId: ticket.originStationId,
                destinationStationId: ticket.destinationStationId,
                ticketType: ticket.ticketType,
                status: ticket.status,
                activatedAt: ticket.activatedAt,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                usedList: ticket.usedList,
                
                // Template selection
                templateName: this.getEmailTemplateName(ticket.ticketType),
                isMultiUse,
                isSingleUse: !isMultiUse,
                
                // Base display data (common for both template types)
                displayData: {
                    fromStationName: stationNames.get(ticket.originStationId) || this._getFallbackStationName(ticket.originStationId),
                    toStationName: stationNames.get(ticket.destinationStationId) || this._getFallbackStationName(ticket.destinationStationId), 
                    ticketTypeName: this.getTicketTypeName(ticket.ticketType, ticket.totalPassengers),
                    formattedPrice: this.formatCurrency(ticket.totalPrice),
                    departureDate: departureInfo.date,
                    departureTime: departureInfo.time,
                    statusText: this.getStatusText(ticket.status),
                    totalPassengersText: this.getTotalPassengersText(ticket.totalPassengers || 1)
                }
            };

            // Add validity data for all ticket types (needed for email templates)
            if (ticket.validFrom && ticket.validUntil) {
                enrichedData.displayData.validFromDate = isMultiUse ? 
                    this.formatValidityDate(ticket.validFrom) : 
                    this.formatDate(ticket.validFrom);
                enrichedData.displayData.validFromTime = isMultiUse ? 
                    this.formatValidityTime(ticket.validFrom) : 
                    this.formatTime(ticket.validFrom);
                enrichedData.displayData.validUntilDate = isMultiUse ? 
                    this.formatValidityDate(ticket.validUntil) : 
                    this.formatDate(ticket.validUntil);
                enrichedData.displayData.validUntilTime = isMultiUse ? 
                    this.formatValidityTime(ticket.validUntil) : 
                    this.formatTime(ticket.validUntil);
                enrichedData.displayData.validUntilDateTime = isMultiUse ? 
                    this.formatValidityDateTime(ticket.validUntil) : 
                    `${this.formatDate(ticket.validUntil)} lúc ${this.formatTime(ticket.validUntil)}`;
                enrichedData.displayData.activationDate = this.formatDate(ticket.activatedAt || ticket.createdAt);
            }

            // Add multi-use specific usage statistics
            if (isMultiUse) {
                const usageStats = this.calculateUsageStats(ticket);
                enrichedData.displayData.usageStats = usageStats;
            }

            logger.debug('Enriched ticket data for event', {
                ticketId: ticket.ticketId,
                ticketType: ticket.ticketType,
                templateName: enrichedData.templateName,
                isMultiUse: enrichedData.isMultiUse,
                originalStations: {
                    origin: ticket.originStationId,
                    destination: ticket.destinationStationId
                },
                enrichedStations: {
                    origin: enrichedData.displayData.fromStationName,
                    destination: enrichedData.displayData.toStationName
                }
            });

            // Info log with key fields that will be sent when activating ticket
            logger.info('Activation payload preview (enriched)', {
                ticketId: ticket.ticketId,
                passengerId: ticket.passengerId,
                ticketType: ticket.ticketType,
                status: ticket.status,
                totalPrice: ticket.totalPrice,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                displayData: enrichedData.displayData
            });

            return enrichedData;

        } catch (error) {
            logger.error('Failed to enrich ticket data', {
                ticketId: ticket.ticketId,
                error: error.message,
                stack: error.stack
            });

            // Return minimal enriched data on error
            const isMultiUse = this.isMultiUseTicket(ticket.ticketType);
            return {
                ticketId: ticket.ticketId,
                passengerId: ticket.passengerId,
                qrCode: ticket.qrCode,
                totalPrice: ticket.totalPrice,
                totalPassengers: ticket.totalPassengers || 1,
                originStationId: ticket.originStationId,
                destinationStationId: ticket.destinationStationId,
                ticketType: ticket.ticketType,
                status: ticket.status,
                activatedAt: ticket.activatedAt,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                usedList: ticket.usedList,
                templateName: this.getEmailTemplateName(ticket.ticketType),
                isMultiUse,
                isSingleUse: !isMultiUse,
                displayData: {
                    fromStationName: this._getFallbackStationName(ticket.originStationId) || 'Không xác định',
                    toStationName: this._getFallbackStationName(ticket.destinationStationId) || 'Không xác định',
                    ticketTypeName: ticket.ticketType || 'Vé một chiều',
                    formattedPrice: this.formatCurrency(ticket.totalPrice || 0),
                    departureDate: this.formatDate(new Date()),
                    departureTime: this.formatTime(new Date()),
                    statusText: ticket.status || 'active',
                    totalPassengersText: this.getTotalPassengersText(ticket.totalPassengers || 1),
                    validFromDate: ticket.validFrom ? 
                        (isMultiUse ? this.formatValidityDate(ticket.validFrom) : this.formatDate(ticket.validFrom)) : 
                        this.formatDate(new Date()),
                    validFromTime: ticket.validFrom ? 
                        (isMultiUse ? this.formatValidityTime(ticket.validFrom) : this.formatTime(ticket.validFrom)) : 
                        this.formatTime(new Date()),
                    validUntilDate: ticket.validUntil ? 
                        (isMultiUse ? this.formatValidityDate(ticket.validUntil) : this.formatDate(ticket.validUntil)) : 
                        this.formatDate(new Date()),
                    validUntilTime: ticket.validUntil ? 
                        (isMultiUse ? this.formatValidityTime(ticket.validUntil) : this.formatTime(ticket.validUntil)) : 
                        this.formatTime(new Date()),
                    validUntilDateTime: ticket.validUntil ? 
                        (isMultiUse ? this.formatValidityDateTime(ticket.validUntil) : 
                         `${this.formatDate(ticket.validUntil)} lúc ${this.formatTime(ticket.validUntil)}`) : 
                        `${this.formatDate(new Date())} lúc ${this.formatTime(new Date())}`,
                    activationDate: this.formatDate(ticket.activatedAt || ticket.createdAt || new Date()),
                    usageStats: isMultiUse ? this.calculateUsageStats(ticket) : null
                }
            };
        }
    }

    /**
     * Get station name from Redis cache
     * @private
     */
    static async _getStationFromCache(stationId) {
        try {
            const redisClient = getClient();
            if (!redisClient) return null;

            const cacheKey = `transport:station:${stationId}`;
            const cached = await redisClient.get(cacheKey);
            
            if (cached) {
                logger.debug('Station name found in cache', { stationId, name: cached });
                return cached;
            }
            return null;
        } catch (error) {
            logger.warn('Failed to get station from cache', { 
                stationId, 
                error: error.message 
            });
            return null;
        }
    }

    /**
     * Cache station name in Redis
     * @private
     */
    static async _cacheStationName(stationId, stationName) {
        try {
            const redisClient = getClient();
            if (!redisClient || !stationName) return;

            const cacheKey = `transport:station:${stationId}`;
            const cacheTTL = 3600; // 1 hour
            
            await redisClient.setEx(cacheKey, cacheTTL, stationName);
            logger.debug('Cached station name', { stationId, name: stationName });
        } catch (error) {
            logger.warn('Failed to cache station name', { 
                stationId, 
                error: error.message 
            });
        }
    }

    /**
     * Utility to chunk array for batch processing
     * @private
     */
    static _chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Extract departure information from QR code
     * @param {string} qrCode - Base64 encoded QR code data
     * @returns {Object} Departure info with date and time
     */
    static extractDepartureInfoFromQR(qrCode) {
        let departureInfo = { date: null, time: null };
        
        if (!qrCode) return departureInfo;
        
        try {
            const decodedData = Buffer.from(qrCode, 'base64').toString('utf8');
            const qrData = JSON.parse(decodedData);
            
            if (qrData.validFrom) {
                const validFromDate = new Date(qrData.validFrom);
                departureInfo.date = this.formatDate(validFromDate);
                departureInfo.time = this.formatTime(validFromDate);
            }
        } catch (parseError) {
            logger.debug('Could not parse QR code for departure info', { 
                error: parseError.message,
                qrCodeLength: qrCode?.length || 0
            });
        }
        
        return departureInfo;
    }

    /**
     * Get status text in Vietnamese
     * @param {string} status - Ticket status
     * @returns {string} Localized status text
     */
    static getStatusText(status) {
        const statusMap = {
            'active': 'Có hiệu lực',
            'inactive': 'Chưa kích hoạt',
            'used': 'Đã sử dụng',
            'expired': 'Hết hạn',
            'cancelled': 'Đã hủy',
            'pending_payment': 'Chờ thanh toán',
        };
        
        return statusMap[status] || status;
    }

    /**
     * Get formatted passengers text
     * @param {number} count - Passenger count
     * @returns {string} Formatted passenger text
     */
    static getTotalPassengersText(count) {
        const num = Number(count) || 1;
        if (num === 1) return '1 hành khách';
        return `${num} hành khách`;
    }

    /**
     * Calculate usage statistics for multi-use tickets
     * @param {Object} ticket - Ticket model instance
     * @returns {Object} Usage statistics
     */
    static calculateUsageStats(ticket) {
        const now = new Date();
        const validUntil = ticket.validUntil ? new Date(ticket.validUntil) : now;
        const usedList = ticket.usedList || [];

        // Calculate days remaining
        const daysRemaining = Math.max(0, Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24)));

        // Get last used date
        let lastUsed = 'Chưa sử dụng';
        if (usedList.length > 0) {
            const lastUsedDate = new Date(Math.max(...usedList.map(date => new Date(date))));
            lastUsed = this.formatDate(lastUsedDate);
        }

        return {
            totalTrips: usedList.length,
            daysRemaining,
            lastUsed
        };
    }

    /**
     * Format date for multi-use ticket validity display with UTC+7 timezone
     * @param {string|Date} date - Date to format
     * @returns {string} Formatted date string for validity display
     */
    static formatValidityDate(date) {
        if (!date) return 'Không xác định';
        return new Date(date).toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh'
        });
    }

    /**
     * Format time for multi-use ticket validity display with UTC+7 timezone
     * @param {string|Date} date - Date to format
     * @returns {string} Formatted time string for validity display
     */
    static formatValidityTime(date) {
        if (!date) return 'Không xác định';
        return new Date(date).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh'
        });
    }

    /**
     * Format date and time for multi-use ticket validity display with UTC+7 timezone
     * @param {string|Date} date - Date to format
     * @returns {string} Formatted date and time string
     */
    static formatValidityDateTime(date) {
        if (!date) return 'Không xác định';
        const dateObj = new Date(date);
        return `${this.formatValidityDate(dateObj)} lúc ${this.formatTime(dateObj)}`;
    }
}

module.exports = TicketDataEnrichmentService;
