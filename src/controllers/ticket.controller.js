const TicketService = require('../services/ticket.service');

class TicketController {
    async createTicket(req, res) {
        try {
            const ticket = await TicketService.createTicket(req.body);
            res.status(201).json(ticket);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getTicketById(req, res) {
        try {
            const ticket = await TicketService.getTicketById(req.params.id);
            if (!ticket) {
                return res.status(404).json({ message: 'Ticket not found' });
            }
            res.json(ticket);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAllTickets(req, res) {
        try {
            const tickets = await TicketService.getAllTickets();
            res.json(tickets);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateTicket(req, res) {
        try {
            const ticket = await TicketService.updateTicket(req.params.id, req.body);
            if (!ticket) {
                return res.status(404).json({ message: 'Ticket not found' });
            }
            res.json(ticket);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async deleteTicket(req, res) {
        try {
            const ticket = await TicketService.deleteTicket(req.params.id);
            if (!ticket) {
                return res.status(404).json({ message: 'Ticket not found' });
            }
            res.json({ message: 'Ticket deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new TicketController(); 