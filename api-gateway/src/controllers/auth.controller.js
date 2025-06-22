const { createAPIToken, hash } = require('../helpers/crypto');
const asyncErrorHandler = require('../services/errorHandling');
const CustomError = require('../utils/CustomError');
const { Key } = require('../models/index.model');

const generateAPIToken = asyncErrorHandler(async (req, res, next) => {
    try {
        const userId = req.params.id;
        const apiToken = createAPIToken();
        const hashToken = hash(apiToken, process.env.HASH_SECRET);
        const newKey = await Key.create({
            value: hashToken,
            userId: userId,
            isActive: true,
            lastUsedAt: new Date()
        });
        res.status(200).json({ status: 'success', token: apiToken });
    } catch (err) {
        const error = new CustomError('Internal Error', 500);
        next(error);
    }
});

const getAPIKeyByUser = asyncErrorHandler(async (req, res, next) => {
    const userId = req.params.userId;
    console.log(userId);
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    try {
        const keys = await Key.findAll({
            where: {
                userId: userId,
                isActive: true,
            },
        });
        return res.status(200).json({ status: 'success', data: keys });
    } catch (err) {
        const error = new CustomError('Internal Error', 500);
        next(error);
    }
});

const deleteKeyById = asyncErrorHandler(async (req, res, next) => {
    const id = req.params.id;

    try {
        const deletedCount = await Key.destroy({
            where: {
                id: id,
            },
        });

        if (deletedCount === 0) {
            return res.status(404).json({ error: 'No API keys found' });
        }

        return res.status(200).json({ status: 'success', deleted: deletedCount });
    } catch (err) {
        const error = new CustomError(err.message || 'Internal Error', 500);
        next(error);
    }
});

module.exports = { generateAPIToken, getAPIKeyByUser, deleteKeyById };
