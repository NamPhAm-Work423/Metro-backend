const trainService = require('../services/train.service');

class TrainController {
    async createTrain(req, res, next) {
        try {
            const train = await trainService.createTrain(req.body);
            return res.status(201).json({
                success: true,
                message: 'Train created successfully',
                data: train
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CREATE_TRAIN'
            });
        }
    }

    async getAllTrains(req, res, next) {
        try {
            const trains = await trainService.getAllTrains(req.query);
            return res.status(200).json({
                success: true,
                data: trains
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ALL_TRAINS'
            });
        }
    }

    async getTrainById(req, res, next) {
        try {
            const train = await trainService.getTrainById(req.params.id);
            return res.status(200).json({
                success: true,
                data: train
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(404).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TRAIN_BY_ID'
            });
        }
    }

    async updateTrain(req, res, next) {
        try {
            const train = await trainService.updateTrain(req.params.id, req.body);
            return res.status(200).json({
                success: true,
                message: 'Train updated successfully',
                data: train
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_UPDATE_TRAIN'
            });
        }
    }

    async deleteTrain(req, res, next) {
        try {
            await trainService.deleteTrain(req.params.id);
            return res.status(200).json({
                success: true,
                message: 'Train deactivated successfully'
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_DELETE_TRAIN'
            });
        }
    }

    async getActiveTrains(req, res, next) {
        try {
            const trains = await trainService.getActiveTrains();
            return res.status(200).json({
                success: true,
                data: trains
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ACTIVE_TRAINS'
            });
        }
    }

    async getTrainsByType(req, res, next) {
        try {
            const trains = await trainService.getTrainsByType(req.params.type);
            return res.status(200).json({
                success: true,
                data: trains
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TRAINS_BY_TYPE'
            });
        }
    }

    async getTrainsByStatus(req, res, next) {
        try {
            const trains = await trainService.getTrainsByStatus(req.params.status);
            return res.status(200).json({
                success: true,
                data: trains
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TRAINS_BY_STATUS'
            });
        }
    }

    async updateTrainStatus(req, res, next) {
        try {
            const { status } = req.body;
            const train = await trainService.updateTrainStatus(req.params.id, status);
            return res.status(200).json({
                success: true,
                message: 'Train status updated successfully',
                data: train
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_UPDATE_TRAIN_STATUS'
            });
        }
    }

    async scheduleTrainMaintenance(req, res, next) {
        try {
            const { maintenanceDate } = req.body;
            const train = await trainService.scheduleMaintenanceForTrain(req.params.id, maintenanceDate);
            return res.status(200).json({
                success: true,
                message: 'Train maintenance scheduled successfully',
                data: train
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_SCHEDULE_TRAIN_MAINTENANCE'
            });
        }
    }

    async getTrainsNeedingMaintenance(req, res, next) {
        try {
            const { daysThreshold } = req.query;
            const trains = await trainService.getTrainsNeedingMaintenance(daysThreshold);
            return res.status(200).json({
                success: true,
                data: trains
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TRAINS_NEEDING_MAINTENANCE'
            });
        }
    }

    async getTrainUtilization(req, res, next) {
        try {
            const utilization = await trainService.getTrainUtilization(req.params.id);
            return res.status(200).json({
                success: true,
                data: utilization
            });
        } catch (error) {
            if (typeof next === 'function') { next(error); }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TRAIN_UTILIZATION'
            });
        }
    }
}

module.exports = new TrainController(); 