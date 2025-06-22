const Ticket = require('../models/ticket.model');
const { AppError } = require('../middlewares/errorHandler');

class TicketService {
    async createTicket(ticketData) {
        try {
            const ticket = new Ticket(ticketData);
            await ticket.save();
            return ticket;
        } catch (error) {
            throw new AppError('Error creating ticket', 500);
        }
    }

    async getTicketById(id) {
        try {
            const ticket = await Ticket.findById(id)
                .populate('passenger')
                .populate('route')
                .populate('schedule');
            return ticket;
        } catch (error) {
            throw new AppError('Error finding ticket', 500);
        }
    }

    async getAllTickets() {
        try {
            const tickets = await Ticket.find()
                .populate('passenger')
                .populate('route')
                .populate('schedule');
            return tickets;
        } catch (error) {
            throw new AppError('Error fetching tickets', 500);
        }
    }

    async updateTicket(id, updateData) {
        try {
            const ticket = await Ticket.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate('passenger')
             .populate('route')
             .populate('schedule');
            return ticket;
        } catch (error) {
            throw new AppError('Error updating ticket', 500);
        }
    }

    async deleteTicket(id) {
        try {
            const ticket = await Ticket.findByIdAndDelete(id);
            return ticket;
        } catch (error) {
            throw new AppError('Error deleting ticket', 500);
        }
    }

    async validateTicket(ticketId) {
        try {
            const ticket = await Ticket.findById(ticketId);
            if (!ticket) {
                throw new AppError('Ticket not found', 404);
            }
            return ticket.isValid();
        } catch (error) {
            throw new AppError('Error validating ticket', 500);
        }
    }

    async getTicketsByPassenger(passengerId) {
        try {
            const tickets = await Ticket.find({ passenger: passengerId })
                .populate('route')
                .populate('schedule');
            return tickets;
        } catch (error) {
            throw new AppError('Error fetching passenger tickets', 500);
        }
    }

    async getTicketsByRoute(routeId) {
        try {
            const tickets = await Ticket.find({ route: routeId })
                .populate('passenger')
                .populate('schedule');
            return tickets;
        } catch (error) {
            throw new AppError('Error fetching route tickets', 500);
        }
    }

    async getTicketsByDate(date) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const tickets = await Ticket.find({
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            }).populate('passenger')
              .populate('route')
              .populate('schedule');
            return tickets;
        } catch (error) {
            throw new AppError('Error fetching tickets by date', 500);
        }
    }
}

module.exports = new TicketService(); 