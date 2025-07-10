const { createAPIToken, hashToken } = require('../helpers/crypto.helper');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const CustomError = require('../utils/customError');
const keyService = require('../services/key.service');
const { logger } = require('../config/logger');

const generateAPIToken = asyncErrorHandler(async (req, res, next) => {
    try {
        const userId = req.params.id;
        
        // Use service layer instead of direct model access
        const { token, keyId } = await keyService.generateAPIKeyForUser(userId);
        
        logger.info('API key generated successfully', { 
            userId, 
            keyId 
        });
        
        res.status(200).json({ 
            status: 'success', 
            token: token,
            message: 'API key generated successfully. Use this key in x-api-key header for routing endpoints.'
        });
    } catch (err) {
        logger.error('Error generating API token:', {
            error: err.message,
            stack: err.stack,
            userId: req.params.id
        });
        const error = new CustomError('Internal Error', 500);
        next(error);
    }
});

const getAPIKeyByUser = asyncErrorHandler(async (req, res, next) => {
    const userId = req.params.userId;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    try {
        logger.info('Getting API keys for user', { userId });
        
        // Use service layer instead of direct model access
        const keys = await keyService.getAPIKeysByUserId(userId);
        
        logger.info('API keys retrieved successfully', { 
            userId, 
            keyCount: keys.length 
        });
        
        return res.status(200).json({ 
            status: 'success', 
            data: keys 
        });
    } catch (err) {
        logger.error('Error getting API keys for user:', {
            error: err.message,
            stack: err.stack,
            userId
        });
        const error = new CustomError('Internal Error', 500);
        next(error);
    }
});

const deleteKeyById = asyncErrorHandler(async (req, res, next) => {
    const id = req.params.id;

    try {
        logger.info('Deleting API key', { keyId: id });
        
        // Use service layer instead of direct model access
        const deleted = await keyService.deleteAPIKeyById(id);

        if (!deleted) {
            logger.warn('API key not found for deletion', { keyId: id });
            return res.status(404).json({ error: 'No API keys found' });
        }

        logger.info('API key deleted successfully', { keyId: id });
        
        return res.status(200).json({ 
            status: 'success', 
            message: 'API key deleted successfully'
        });
    } catch (err) {
        logger.error('Error deleting API key:', {
            error: err.message,
            stack: err.stack,
            keyId: id
        });
        const error = new CustomError(err.message || 'Internal Error', 500);
        next(error);
    }
});

module.exports = { generateAPIToken, getAPIKeyByUser, deleteKeyById };
