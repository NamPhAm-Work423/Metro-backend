/**
 * Legacy Promotion Service - Backward compatibility wrapper
 * This file maintains backward compatibility while using the new SOLID structure
 */

const { promotionService } = require('./promotion');

// Export the singleton instance for backward compatibility
module.exports = promotionService;
