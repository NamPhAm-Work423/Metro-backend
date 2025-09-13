const { SMS } = require('../src/models');
const { logger } = require('../src/config/logger');

/**
 * Cleanup script to remove sent notifications
 */
async function cleanupSentNotifications() {
    try {
        logger.info('Starting cleanup of sent notifications...');
        
        // Delete notifications with status 'sent' older than 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        const result = await SMS.destroy({
            where: {
                status: 'sent',
                createdAt: {
                    [require('sequelize').Op.lt]: oneHourAgo
                }
            }
        });
        
        logger.info(`Cleaned up ${result} sent notifications older than 1 hour`);
        
        // Also delete mock notifications immediately (for testing)
        const mockResult = await SMS.destroy({
            where: {
                status: 'sent',
                provider: 'mock'
            }
        });
        
        logger.info(`Cleaned up ${mockResult} mock notifications`);
        
        console.log(`✅ Cleanup completed: ${result + mockResult} notifications removed`);
        
    } catch (error) {
        logger.error('Cleanup failed', { error: error.message });
        console.error('❌ Cleanup failed:', error.message);
    }
}

// Run cleanup if called directly
if (require.main === module) {
    cleanupSentNotifications()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { cleanupSentNotifications };
