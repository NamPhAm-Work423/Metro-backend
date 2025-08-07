/**
 * Ticket Service Module
 * 
 * This module provides a comprehensive ticket management system following SOLID principles.
 * It is organized into clear separation of concerns:
 * 
 * - interfaces/: Define contracts for services
 * - repositories/: Handle data access layer
 * - services/: Business logic implementation
 * - calculators/: Complex calculations (if needed)
 * 
 * @module ticket
 */

// Import interfaces
const ITicketService = require('./interfaces/ITicketService');
const ITicketRepository = require('./interfaces/ITicketRepository');
const ITicketValidator = require('./interfaces/ITicketValidator');

// Import repositories
const TicketRepository = require('./repositories/TicketRepository');

// Import services
const TicketService = require('./services/TicketService');
const TicketValidatorService = require('./services/TicketValidatorService');
const TicketCommunicationService = require('./services/TicketCommunicationService');
const TicketPaymentService = require('./services/TicketPaymentService');

// Import calculators
const TicketPriceCalculator = require('./calculators/TicketPriceCalculator');

// Export interfaces
module.exports = {
    // Interfaces
    ITicketService,
    ITicketRepository,
    ITicketValidator,

    // Repositories
    TicketRepository,

    // Services
    TicketService,
    TicketValidatorService,
    TicketCommunicationService,
    TicketPaymentService,

    // Calculators
    TicketPriceCalculator,

    // Default export (main service)
    default: TicketService
};
