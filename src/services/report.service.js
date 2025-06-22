const Ticket = require('../models/ticket.model');
const Payment = require('../models/payment.model');
const { AppError } = require('../middlewares/errorHandler');

class ReportService {
    async generateTicketReport(startDate, endDate) {
        try {
            const tickets = await Ticket.find({
                createdAt: { $gte: startDate, $lte: endDate }
            }).populate('passenger')
              .populate('route')
              .populate('schedule');

            const report = {
                totalTickets: tickets.length,
                totalRevenue: tickets.reduce((sum, ticket) => sum + ticket.amount, 0),
                ticketsByRoute: await this.groupTicketsByRoute(tickets),
                ticketsByDate: await this.groupTicketsByDate(tickets),
                ticketsByPassenger: await this.groupTicketsByPassenger(tickets)
            };

            return report;
        } catch (error) {
            throw new AppError('Error generating ticket report', 500);
        }
    }

    async generatePaymentReport(startDate, endDate) {
        try {
            const payments = await Payment.find({
                createdAt: { $gte: startDate, $lte: endDate }
            }).populate('ticket')
              .populate('paymentGateway');

            const report = {
                totalPayments: payments.length,
                totalAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
                paymentsByGateway: await this.groupPaymentsByGateway(payments),
                paymentsByDate: await this.groupPaymentsByDate(payments),
                paymentsByStatus: await this.groupPaymentsByStatus(payments)
            };

            return report;
        } catch (error) {
            throw new AppError('Error generating payment report', 500);
        }
    }

    async generateRevenueReport(startDate, endDate) {
        try {
            const payments = await Payment.find({
                createdAt: { $gte: startDate, $lte: endDate },
                status: 'completed'
            }).populate('ticket');

            const report = {
                totalRevenue: payments.reduce((sum, payment) => sum + payment.amount, 0),
                revenueByDate: await this.groupRevenueByDate(payments),
                revenueByRoute: await this.groupRevenueByRoute(payments),
                averageTicketPrice: this.calculateAverageTicketPrice(payments)
            };

            return report;
        } catch (error) {
            throw new AppError('Error generating revenue report', 500);
        }
    }

    async generatePassengerReport(startDate, endDate) {
        try {
            const tickets = await Ticket.find({
                createdAt: { $gte: startDate, $lte: endDate }
            }).populate('passenger');

            const report = {
                totalPassengers: new Set(tickets.map(ticket => ticket.passenger._id)).size,
                passengersByDate: await this.groupPassengersByDate(tickets),
                passengersByRoute: await this.groupPassengersByRoute(tickets),
                passengerRetention: await this.calculatePassengerRetention(tickets)
            };

            return report;
        } catch (error) {
            throw new AppError('Error generating passenger report', 500);
        }
    }

    // Helper methods for grouping and calculations
    async groupTicketsByRoute(tickets) {
        const grouped = {};
        tickets.forEach(ticket => {
            const routeId = ticket.route._id.toString();
            if (!grouped[routeId]) {
                grouped[routeId] = {
                    route: ticket.route,
                    count: 0,
                    revenue: 0
                };
            }
            grouped[routeId].count++;
            grouped[routeId].revenue += ticket.amount;
        });
        return Object.values(grouped);
    }

    async groupTicketsByDate(tickets) {
        const grouped = {};
        tickets.forEach(ticket => {
            const date = ticket.createdAt.toISOString().split('T')[0];
            if (!grouped[date]) {
                grouped[date] = {
                    date,
                    count: 0,
                    revenue: 0
                };
            }
            grouped[date].count++;
            grouped[date].revenue += ticket.amount;
        });
        return Object.values(grouped);
    }

    async groupTicketsByPassenger(tickets) {
        const grouped = {};
        tickets.forEach(ticket => {
            const passengerId = ticket.passenger._id.toString();
            if (!grouped[passengerId]) {
                grouped[passengerId] = {
                    passenger: ticket.passenger,
                    count: 0,
                    totalSpent: 0
                };
            }
            grouped[passengerId].count++;
            grouped[passengerId].totalSpent += ticket.amount;
        });
        return Object.values(grouped);
    }

    async groupPaymentsByGateway(payments) {
        const grouped = {};
        payments.forEach(payment => {
            const gatewayId = payment.paymentGateway._id.toString();
            if (!grouped[gatewayId]) {
                grouped[gatewayId] = {
                    gateway: payment.paymentGateway,
                    count: 0,
                    amount: 0
                };
            }
            grouped[gatewayId].count++;
            grouped[gatewayId].amount += payment.amount;
        });
        return Object.values(grouped);
    }

    async groupPaymentsByDate(payments) {
        const grouped = {};
        payments.forEach(payment => {
            const date = payment.createdAt.toISOString().split('T')[0];
            if (!grouped[date]) {
                grouped[date] = {
                    date,
                    count: 0,
                    amount: 0
                };
            }
            grouped[date].count++;
            grouped[date].amount += payment.amount;
        });
        return Object.values(grouped);
    }

    async groupPaymentsByStatus(payments) {
        const grouped = {};
        payments.forEach(payment => {
            if (!grouped[payment.status]) {
                grouped[payment.status] = {
                    status: payment.status,
                    count: 0,
                    amount: 0
                };
            }
            grouped[payment.status].count++;
            grouped[payment.status].amount += payment.amount;
        });
        return Object.values(grouped);
    }

    async groupRevenueByDate(payments) {
        const grouped = {};
        payments.forEach(payment => {
            const date = payment.createdAt.toISOString().split('T')[0];
            if (!grouped[date]) {
                grouped[date] = {
                    date,
                    amount: 0
                };
            }
            grouped[date].amount += payment.amount;
        });
        return Object.values(grouped);
    }

    async groupRevenueByRoute(payments) {
        const grouped = {};
        payments.forEach(payment => {
            const routeId = payment.ticket.route.toString();
            if (!grouped[routeId]) {
                grouped[routeId] = {
                    route: payment.ticket.route,
                    amount: 0
                };
            }
            grouped[routeId].amount += payment.amount;
        });
        return Object.values(grouped);
    }

    calculateAverageTicketPrice(payments) {
        if (payments.length === 0) return 0;
        const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
        return total / payments.length;
    }

    async groupPassengersByDate(tickets) {
        const grouped = {};
        tickets.forEach(ticket => {
            const date = ticket.createdAt.toISOString().split('T')[0];
            if (!grouped[date]) {
                grouped[date] = new Set();
            }
            grouped[date].add(ticket.passenger._id.toString());
        });
        return Object.entries(grouped).map(([date, passengers]) => ({
            date,
            count: passengers.size
        }));
    }

    async groupPassengersByRoute(tickets) {
        const grouped = {};
        tickets.forEach(ticket => {
            const routeId = ticket.route._id.toString();
            if (!grouped[routeId]) {
                grouped[routeId] = new Set();
            }
            grouped[routeId].add(ticket.passenger._id.toString());
        });
        return Object.entries(grouped).map(([routeId, passengers]) => ({
            route: routeId,
            count: passengers.size
        }));
    }

    async calculatePassengerRetention(tickets) {
        const passengerTrips = {};
        tickets.forEach(ticket => {
            const passengerId = ticket.passenger._id.toString();
            if (!passengerTrips[passengerId]) {
                passengerTrips[passengerId] = 0;
            }
            passengerTrips[passengerId]++;
        });

        const retention = {
            singleTrip: 0,
            multipleTrips: 0,
            totalPassengers: Object.keys(passengerTrips).length
        };

        Object.values(passengerTrips).forEach(trips => {
            if (trips === 1) {
                retention.singleTrip++;
            } else {
                retention.multipleTrips++;
            }
        });

        return retention;
    }
}

module.exports = new ReportService(); 