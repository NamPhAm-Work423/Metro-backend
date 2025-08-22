const trainService = require('../services/train.service');

class TrainController {
    async createTrain(req, res, next) {
        try {
            const train = await trainService.createTrain(req.body);
            res.status(201).json({
                success: true,
                message: 'Train created successfully',
                data: train
            });
        } catch (error) {
            next(error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllTrains(req, res, next) {
        try {
            const trains = await trainService.getAllTrains(req.query);
            res.status(200).json({
                success: true,
                data: trains
            });
        } catch (error) {
            next(error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTrainById(req, res, next) {
        try {
            const train = await trainService.getTrainById(req.params.id);
            res.status(200).json({
                success: true,
                data: train
            });
        } catch (error) {
            next(error);
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateTrain(req, res, next) {
        try {
            const train = await trainService.updateTrain(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'Train updated successfully',
                data: train
            });
        } catch (error) {
            next(error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteTrain(req, res, next) {
        try {
            await trainService.deleteTrain(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Train deactivated successfully'
            });
        } catch (error) {
            next(error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getActiveTrains(req, res, next) {
        try {
            const trains = await trainService.getActiveTrains();
            res.status(200).json({
                success: true,
                data: trains
            });
        } catch (error) {
            next(error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTrainsByType(req, res, next) {
        try {
            const trains = await trainService.getTrainsByType(req.params.type);
            res.status(200).json({
                success: true,
                data: trains
            });
        } catch (error) {
            next(error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTrainsByStatus(req, res, next) {
        try {
            const trains = await trainService.getTrainsByStatus(req.params.status);
            res.status(200).json({
                success: true,
                data: trains
            });
        } catch (error) {
            next(error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateTrainStatus(req, res, next) {
        try {
            const { status } = req.body;
            const train = await trainService.updateTrainStatus(req.params.id, status);
            res.status(200).json({
                success: true,
                message: 'Train status updated successfully',
                data: train
            });
        } catch (error) {
            next(error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async scheduleTrainMaintenance(req, res, next) {
        try {
            const { maintenanceDate } = req.body;
            const train = await trainService.scheduleMaintenanceForTrain(req.params.id, maintenanceDate);
            res.status(200).json({
                success: true,
                message: 'Train maintenance scheduled successfully',
                data: train
            });
        } catch (error) {
            next(error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTrainsNeedingMaintenance(req, res, next) {
        try {
            const { daysThreshold } = req.query;
            const trains = await trainService.getTrainsNeedingMaintenance(daysThreshold);
            res.status(200).json({
                success: true,
                data: trains
            });
        } catch (error) {
            next(error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTrainUtilization(req, res, next) {
        try {
            const utilization = await trainService.getTrainUtilization(req.params.id);
            res.status(200).json({
                success: true,
                data: utilization
            });
        } catch (error) {
            next(error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new TrainController(); 