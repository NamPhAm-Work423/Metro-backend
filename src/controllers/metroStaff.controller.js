const MetroStaffService = require('../services/metroStaff.service');

class MetroStaffController {
    async getStaffProfile(req, res) {
        try {
            const staff = await MetroStaffService.getStaffById(req.user.userId);
            if (!staff) {
                return res.status(404).json({ message: 'Staff not found' });
            }
            res.json(staff);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateStaffProfile(req, res) {
        try {
            const staff = await MetroStaffService.updateStaff(req.user.userId, req.body);
            if (!staff) {
                return res.status(404).json({ message: 'Staff not found' });
            }
            res.json(staff);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAssignedSchedule(req, res) {
        try {
            const schedule = await MetroStaffService.getAssignedSchedule(req.user.userId);
            res.json(schedule);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async validateTicket(req, res) {
        try {
            const { ticketId } = req.body;
            const result = await MetroStaffService.validateTicket(ticketId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async reportIssue(req, res) {
        try {
            const issue = await MetroStaffService.reportIssue(req.user.userId, req.body);
            res.status(201).json(issue);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getDailyReport(req, res) {
        try {
            const report = await MetroStaffService.getDailyReport(req.user.userId);
            res.json(report);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async handlePassengerComplaint(req, res) {
        try {
            const complaint = await MetroStaffService.handlePassengerComplaint(
                req.user.userId,
                req.body
            );
            res.json(complaint);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new MetroStaffController(); 