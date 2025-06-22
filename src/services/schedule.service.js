const Schedule = require('../models/schedule.model');
const { AppError } = require('../middlewares/errorHandler');

class ScheduleService {
    async createSchedule(scheduleData) {
        try {
            const schedule = new Schedule(scheduleData);
            await schedule.save();
            return schedule;
        } catch (error) {
            throw new AppError('Error creating schedule', 500);
        }
    }

    async getScheduleById(id) {
        try {
            const schedule = await Schedule.findById(id)
                .populate('route')
                .populate('train');
            if (!schedule) {
                throw new AppError('Schedule not found', 404);
            }
            return schedule;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error finding schedule', 500);
        }
    }

    async getAllSchedules() {
        try {
            const schedules = await Schedule.find()
                .populate('route')
                .populate('train');
            return schedules;
        } catch (error) {
            throw new AppError('Error fetching schedules', 500);
        }
    }

    async updateSchedule(id, updateData) {
        try {
            const schedule = await Schedule.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate('route')
             .populate('train');
            if (!schedule) {
                throw new AppError('Schedule not found', 404);
            }
            return schedule;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error updating schedule', 500);
        }
    }

    async deleteSchedule(id) {
        try {
            const schedule = await Schedule.findByIdAndDelete(id);
            if (!schedule) {
                throw new AppError('Schedule not found', 404);
            }
            return schedule;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error deleting schedule', 500);
        }
    }

    async getSchedulesByRoute(routeId) {
        try {
            const schedules = await Schedule.find({ route: routeId })
                .populate('train');
            return schedules;
        } catch (error) {
            throw new AppError('Error fetching route schedules', 500);
        }
    }

    async getSchedulesByDate(date) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const schedules = await Schedule.find({
                departureTime: { $gte: startOfDay, $lte: endOfDay }
            }).populate('route')
              .populate('train');
            return schedules;
        } catch (error) {
            throw new AppError('Error fetching schedules by date', 500);
        }
    }

    async getSchedulesByTrain(trainId) {
        try {
            const schedules = await Schedule.find({ train: trainId })
                .populate('route');
            return schedules;
        } catch (error) {
            throw new AppError('Error fetching train schedules', 500);
        }
    }

    async getScheduleStats() {
        try {
            const totalSchedules = await Schedule.countDocuments();
            const activeSchedules = await Schedule.countDocuments({ status: 'active' });
            const schedulesByDay = await Schedule.aggregate([
                { $group: { _id: { $dayOfWeek: '$departureTime' }, count: { $sum: 1 } } }
            ]);

            return {
                totalSchedules,
                activeSchedules,
                schedulesByDay
            };
        } catch (error) {
            throw new AppError('Error fetching schedule statistics', 500);
        }
    }
}

module.exports = new ScheduleService(); 