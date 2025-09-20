const asyncErrorHandler = require('../helpers/errorHandler.helper');
const CustomError = require('../utils/customError');
const keyService = require('../services/key.service');
const { logger } = require('../config/logger');
const { addCustomSpan  } = require('../tracing');

const generateAPIToken = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan ('auth.generate-api-token', async (span) => {
        try {
        const userId = req.params.id;

        const { token, keyId } = await keyService.generateAPIKeyForUser(userId);

        logger.info('API key generated successfully', { 
            userId, 
            keyId 
        });

        return res.status(200).json({ 
            success: true,
            message: 'API key generated successfully. Use this key in x-api-key header for routing endpoints.',
            data: { token, keyId }
        });
    } catch (error) {
        span.recordException(error);
        logger.error('Error generating API token:', {
            error: error.message,
            stack: error.stack,
            userId: req.params.id
        });
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'INTERNAL_ERROR'
        });
    }
    });
});

const getAPIKeyByUser = asyncErrorHandler(async (req, res, next) => {
    const userId = req.params.userId;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: 'User ID is required',
            error: 'USER_ID_REQUIRED'
        });
    }

    try {
        await addCustomSpan ('auth.get-api-keys-by-user', async (span) => {
        logger.info('Getting API keys for user', { userId });

        const keys = await keyService.getAPIKeysByUserId(userId);

        logger.info('API keys retrieved successfully', { 
            userId, 
            keyCount: keys.length 
        });

        return res.status(200).json({ 
            success: true,
            data: { keys }
        });
        });
    } catch (error) {
        logger.error('Error getting API keys for user:', {
            error: error.message,
            stack: error.stack,
            userId
        });
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'INTERNAL_ERROR'
        });
    }
});

const deleteKeyById = asyncErrorHandler(async (req, res, next) => {
    const id = req.params.id;

    try {
        await addCustomSpan ('auth.delete-api-key', async (span) => {
        logger.info('Deleting API key', { keyId: id });

        const deleted = await keyService.deleteAPIKeyById(id);

        if (!deleted) {
            logger.warn('API key not found for deletion', { keyId: id });
            return res.status(404).json({
                success: false,
                message: 'API key not found',
                error: 'API_KEY_NOT_FOUND'
            });
        }

        logger.info('API key deleted successfully', { keyId: id });

        return res.status(200).json({ 
            success: true,
            message: 'API key deleted successfully'
        });
        });
    } catch (error) {
        logger.error('Error deleting API key:', {
            error: error.message,
            stack: error.stack,
            keyId: id
        });
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'INTERNAL_ERROR'
        });
    }
});

module.exports = { generateAPIToken, getAPIKeyByUser, deleteKeyById };
