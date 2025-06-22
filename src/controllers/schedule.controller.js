const ScheduleService = require('../services/schedule.service');

class ScheduleController {
    async createSchedule(req, res) {
        try {
            const schedule = await ScheduleService.createSchedule(req.body);
            res.status(201).json(schedule);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getScheduleById(req, res) {
        try {
            const schedule = await ScheduleService.getScheduleById(req.params.id);
            if (!schedule) {
                return res.status(404).json({ message: 'Schedule not found' });
            }
            res.json(schedule);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAllSchedules(req, res) {
        try {
            const schedules = await ScheduleService.getAllSchedules(req.query);
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateSchedule(req, res) {
        try {
            const schedule = await ScheduleService.updateSchedule(req.params.id, req.body);
            if (!schedule) {
                return res.status(404).json({ message: 'Schedule not found' });
            }
            res.json(schedule);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async deleteSchedule(req, res) {
        try {
            const schedule = await ScheduleService.deleteSchedule(req.params.id);
            if (!schedule) {
                return res.status(404).json({ message: 'Schedule not found' });
            }
            res.json({ message: 'Schedule deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getScheduleByRoute(req, res) {
        try {
            const schedules = await ScheduleService.getScheduleByRoute(req.params.routeId);
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getScheduleByStation(req, res) {
        try {
            const schedules = await ScheduleService.getScheduleByStation(req.params.stationId);
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getScheduleByDate(req, res) {
        try {
            const schedules = await ScheduleService.getScheduleByDate(req.query.date);
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getScheduleByTimeRange(req, res) {
        try {
            const { startTime, endTime } = req.query;
            const schedules = await ScheduleService.getScheduleByTimeRange(startTime, endTime);
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateScheduleStatus(req, res) {
        try {
            const status = await ScheduleService.updateScheduleStatus(
                req.params.id,
                req.body.status
            );
            res.json(status);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new ScheduleController(); 