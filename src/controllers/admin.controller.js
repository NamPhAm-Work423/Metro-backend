const AdminService = require('../services/admin.service');

class AdminController {
    async getDashboardStats(req, res) {
        try {
            const stats = await AdminService.getDashboardStats();
            res.json(stats);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async manageUsers(req, res) {
        try {
            const users = await AdminService.getAllUsers(req.query);
            res.json(users);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async manageStaff(req, res) {
        try {
            const staff = await AdminService.getAllStaff(req.query);
            res.json(staff);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async manageRoutes(req, res) {
        try {
            const routes = await AdminService.getAllRoutes(req.query);
            res.json(routes);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async manageSchedules(req, res) {
        try {
            const schedules = await AdminService.getAllSchedules(req.query);
            res.json(schedules);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async manageFares(req, res) {
        try {
            const fares = await AdminService.getAllFares(req.query);
            res.json(fares);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async managePromotions(req, res) {
        try {
            const promotions = await AdminService.getAllPromotions(req.query);
            res.json(promotions);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async generateReports(req, res) {
        try {
            const reports = await AdminService.generateReports(req.query);
            res.json(reports);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async systemSettings(req, res) {
        try {
            if (req.method === 'GET') {
                const settings = await AdminService.getSystemSettings();
                res.json(settings);
            } else if (req.method === 'PUT') {
                const settings = await AdminService.updateSystemSettings(req.body);
                res.json(settings);
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new AdminController(); 