const { createAPIToken, hashToken } = require('../helpers/crypto.helper');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const CustomError = require('../utils/CustomError');
const { Key } = require('../models/index.model');
const keyService = require('../services/key.service');
const { logger } = require('../config/logger');

const generateAPIToken = asyncErrorHandler(async (req, res, next) => {
    try {
        const userId = req.params.id;
        const apiToken = createAPIToken();
        const hashedToken = hashToken(apiToken, process.env.HASH_SECRET);
        
        // Store in database for management
        const newKey = await Key.create({
            value: hashedToken,
            userId: userId,
            isActive: true,
            lastUsedAt: new Date()
        });
        
        // Store in Redis for fast validation
        await keyService.storeAPIKey(apiToken, { 
            userId: userId,
            keyId: newKey.id 
        });
        
        logger.info('API key generated successfully', { 
            userId, 
            keyId: newKey.id 
        });
        
        res.status(200).json({ 
            status: 'success', 
            token: apiToken,
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
        
        const keys = await Key.findAll({
            where: {
                userId: userId,
                isActive: true,
            },
        });
        
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
        
        const deletedCount = await Key.destroy({
            where: {
                id: id,
            },
        });

        if (deletedCount === 0) {
            logger.warn('API key not found for deletion', { keyId: id });
            return res.status(404).json({ error: 'No API keys found' });
        }

        logger.info('API key deleted successfully', { keyId: id, deletedCount });
        
        return res.status(200).json({ 
            status: 'success', 
            deleted: deletedCount,
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
