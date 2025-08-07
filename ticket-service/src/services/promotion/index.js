/**
 * Promotion Service Module - SOLID Principles Implementation
 * 
 * This module provides a complete promotion management system following SOLID principles:
 * 
 * Single Responsibility Principle (SRP):
 * - Each class has one reason to change
 * - PromotionRepository: Only handles data access
 * - PromotionValidator: Only handles validation and application
 * - PromotionService: Orchestrates operations using dependency injection
 * 
 * Open/Closed Principle (OCP):
 * - Open for extension, closed for modification
 * - New validator types can be added without modifying existing code
 * - New repository implementations can be added without changing services
 * 
 * Liskov Substitution Principle (LSP):
 * - All implementations properly extend their interfaces
 * - Validators can be substituted without breaking the system
 * 
 * Interface Segregation Principle (ISP):
 * - Interfaces are specific to client needs
 * - IPromotionService: CRUD operations
 * - IPromotionValidator: Validation operations
 * 
 * Dependency Inversion Principle (DIP):
 * - High-level modules don't depend on low-level modules
 * - Both depend on abstractions
 * - Dependency injection is used throughout
 */

// Interfaces
const IPromotionService = require('./interfaces/IPromotionService');
const IPromotionValidator = require('./interfaces/IPromotionValidator');

// Repositories
const PromotionRepository = require('./repositories/PromotionRepository');

// Validators
const PromotionValidator = require('./validators/PromotionValidator');

// Services
const PromotionService = require('./PromotionService');

// Factory
const PromotionServiceFactory = require('./PromotionServiceFactory');

// Default export - create a configured instance
const createPromotionService = () => PromotionServiceFactory.createPromotionService();

module.exports = {
    // Interfaces
    IPromotionService,
    IPromotionValidator,
    
    // Repositories
    PromotionRepository,
    
    // Validators
    PromotionValidator,
    
    // Services
    PromotionService,
    
    // Factory
    PromotionServiceFactory,
    
    // Default instance
    createPromotionService,
    
    // Singleton instance (for backward compatibility)
    promotionService: createPromotionService()
};
