/**
 * Ticket Service - Main Entry Point
 * 
 * This file serves as the main entry point for the ticket service module.
 * It imports and re-exports the new modular ticket service structure
 * to maintain backward compatibility while providing a cleaner architecture.
 * 
 * The actual implementation has been moved to the ticket/ directory following
 * SOLID principles with clear separation of concerns.
 */

// Import the new modular ticket service
const TicketService = require('./ticket/services/TicketService');

// Re-export the main service for backward compatibility
module.exports = TicketService;
