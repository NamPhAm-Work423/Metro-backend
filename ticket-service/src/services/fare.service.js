/**
 * Legacy Fare Service - Backward compatibility wrapper
 * This file maintains backward compatibility while using the new SOLID structure
 */

const { fareService } = require('./fare');

// Export the singleton instance for backward compatibility
module.exports = fareService;
