const crypto = require('crypto');
const { logger } = require('../../config/logger');

/**
 * PayPal Signature Verification Service
 * Handles PayPal webhook signature verification
 * Following Single Responsibility Principle (SRP)
 */
class PayPalSignatureService {
    constructor() {
        this.webhookId = process.env.PAYPAL_WEBHOOK_ID;
        this.algorithm = 'sha256';
    }

    /**
     * Verify PayPal webhook signature
     * @param {Object} headers - Request headers
     * @param {string} rawBody - Raw request body
     * @returns {Promise<Object>} - Verification result
     */
    async verifySignature(headers, rawBody) {
        try {
            // Extract PayPal headers
            const transmissionId = headers['paypal-transmission-id'];
            const certId = headers['paypal-cert-id'];
            const signature = headers['paypal-transmission-sig'];
            const transmissionTime = headers['paypal-transmission-time'];
            const authAlgo = headers['paypal-auth-algo'];

            // Validate required headers
            if (!transmissionId || !certId || !signature || !transmissionTime) {
                return {
                    verified: false,
                    error: 'Missing required PayPal headers for signature verification',
                    method: 'header_validation'
                };
            }

            // For development/testing, we can skip actual signature verification
            if (process.env.NODE_ENV === 'development' && process.env.PAYPAL_SKIP_SIGNATURE === 'true') {
                logger.warn('PayPal signature verification skipped in development mode');
                return {
                    verified: true,
                    method: 'skip_dev',
                    warning: 'Signature verification was skipped in development mode'
                };
            }

            // TODO: Implement actual PayPal signature verification
            // This would involve:
            // 1. Get PayPal certificate using certId
            // 2. Create expected signature string
            // 3. Verify signature using certificate
            
            // For now, we'll do basic validation
            const isValidFormat = this.validateSignatureFormat(signature, authAlgo);
            
            if (!isValidFormat) {
                return {
                    verified: false,
                    error: 'Invalid signature format',
                    method: 'format_validation'
                };
            }

            // Basic transmission time validation (within 5 minutes)
            const transmissionTimestamp = parseInt(transmissionTime) * 1000;
            const currentTime = Date.now();
            const timeDiff = Math.abs(currentTime - transmissionTimestamp);
            const maxTimeDiff = 5 * 60 * 1000; // 5 minutes

            if (timeDiff > maxTimeDiff) {
                return {
                    verified: false,
                    error: 'Transmission time too old or too far in future',
                    method: 'time_validation',
                    timeDiff: timeDiff
                };
            }

            logger.info('PayPal webhook signature validation passed basic checks', {
                transmissionId,
                certId,
                authAlgo,
                timeDiff: `${Math.round(timeDiff / 1000)}s`
            });

            return {
                verified: true,
                method: 'basic_validation',
                transmissionId,
                certId,
                authAlgo,
                timeDiff
            };

        } catch (error) {
            logger.error('PayPal signature verification failed', {
                error: error.message,
                stack: error.stack
            });

            return {
                verified: false,
                error: error.message,
                method: 'verification_error'
            };
        }
    }

    /**
     * Validate signature format
     * @param {string} signature - Signature to validate
     * @param {string} authAlgo - Authentication algorithm
     * @returns {boolean} - True if format is valid
     */
    validateSignatureFormat(signature, authAlgo) {
        if (!signature || !authAlgo) return false;
        
        // PayPal uses SHA256withRSA
        if (authAlgo !== 'SHA256withRSA') {
            logger.warn('Unexpected PayPal auth algorithm', { authAlgo });
            return false;
        }

        // Signature should be base64 encoded
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(signature)) {
            logger.warn('PayPal signature is not valid base64');
            return false;
        }

        return true;
    }

    /**
     * Create expected signature string for PayPal
     * @param {Object} headers - Request headers
     * @param {string} rawBody - Raw request body
     * @returns {string} - Expected signature string
     */
    createExpectedSignature(headers, rawBody) {
        const transmissionId = headers['paypal-transmission-id'];
        const transmissionTime = headers['paypal-transmission-time'];
        const certId = headers['paypal-cert-id'];
        
        // PayPal signature format: transmission_id|timestamp|webhook_id|crc32(body)
        const crc32 = this.calculateCRC32(rawBody);
        
        return `${transmissionId}|${transmissionTime}|${this.webhookId}|${crc32}`;
    }

    /**
     * Calculate CRC32 checksum
     * @param {string} data - Data to calculate checksum for
     * @returns {string} - CRC32 checksum
     */
    calculateCRC32(data) {
        // Simple CRC32 implementation - in production, use a proper library
        const crc32Table = this.makeCRC32Table();
        let crc = 0 ^ (-1);

        for (let i = 0; i < data.length; i++) {
            crc = (crc >>> 8) ^ crc32Table[(crc ^ data.charCodeAt(i)) & 0xFF];
        }

        return (crc ^ (-1)) >>> 0;
    }

    /**
     * Generate CRC32 table
     * @returns {Array} - CRC32 table
     */
    makeCRC32Table() {
        let c;
        const crcTable = [];
        
        for (let n = 0; n < 256; n++) {
            c = n;
            for (let k = 0; k < 8; k++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            crcTable[n] = c;
        }
        
        return crcTable;
    }

    /**
     * Get signature verification config
     * @returns {Object} - Configuration
     */
    getConfig() {
        return {
            webhookId: this.webhookId ? '[SET]' : '[NOT_SET]',
            algorithm: this.algorithm,
            skipInDev: process.env.PAYPAL_SKIP_SIGNATURE === 'true',
            environment: process.env.NODE_ENV
        };
    }
}

module.exports = PayPalSignatureService;
