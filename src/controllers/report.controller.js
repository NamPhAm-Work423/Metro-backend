const ReportService = require('../services/report.service');

class ReportController {
    async generateDailyReport(req, res) {
        try {
            const { date } = req.query;
            const report = await ReportService.generateDailyReport(date);
            res.json(report);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async generateMonthlyReport(req, res) {
        try {
            const { month, year } = req.query;
            const report = await ReportService.generateMonthlyReport(month, year);
            res.json(report);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async generateYearlyReport(req, res) {
        try {
            const { year } = req.query;
            const report = await ReportService.generateYearlyReport(year);
            res.json(report);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async generateRevenueReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const report = await ReportService.generateRevenueReport(startDate, endDate);
            res.json(report);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async generatePassengerReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const report = await ReportService.generatePassengerReport(startDate, endDate);
            res.json(report);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async generateStationReport(req, res) {
        try {
            const { stationId, startDate, endDate } = req.query;
            const report = await ReportService.generateStationReport(stationId, startDate, endDate);
            res.json(report);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async generateRouteReport(req, res) {
        try {
            const { routeId, startDate, endDate } = req.query;
            const report = await ReportService.generateRouteReport(routeId, startDate, endDate);
            res.json(report);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async generatePromotionReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const report = await ReportService.generatePromotionReport(startDate, endDate);
            res.json(report);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async generateStaffReport(req, res) {
        try {
            const { staffId, startDate, endDate } = req.query;
            const report = await ReportService.generateStaffReport(staffId, startDate, endDate);
            res.json(report);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async exportReport(req, res) {
        try {
            const { reportId, format } = req.query;
            const report = await ReportService.exportReport(reportId, format);
            res.json(report);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new ReportController(); 