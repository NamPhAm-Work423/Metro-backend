/**
 * Fare Service Module - SOLID Principles Implementation
 * 
 * This module provides a complete fare management system following SOLID principles:
 * 
 * Single Responsibility Principle (SRP):
 * - Each class has one reason to change
 * - FareRepository: Only handles data access
 * - StationService: Only handles station operations
 * - StationBasedFareCalculator: Only handles station-based calculations
 * - PassBasedFareCalculator: Only handles pass-based calculations
 * - MultiRouteFareCalculator: Only handles multi-route calculations
 * - FareService: Orchestrates operations using dependency injection
 * 
 * Open/Closed Principle (OCP):
 * - Open for extension, closed for modification
 * - New calculator types can be added without modifying existing code
 * - New repository implementations can be added without changing services
 * 
 * Liskov Substitution Principle (LSP):
 * - All implementations properly extend their interfaces
 * - Calculators can be substituted without breaking the system
 * 
 * Interface Segregation Principle (ISP):
 * - Interfaces are specific to client needs
 * - IFareService: CRUD operations
 * - IFareCalculator: Calculation operations
 * - IStationService: Station operations
 * 
 * Dependency Inversion Principle (DIP):
 * - High-level modules don't depend on low-level modules
 * - Both depend on abstractions
 * - Dependency injection is used throughout
 */

// Interfaces
const IFareService = require('./interfaces/IFareService');
const IFareCalculator = require('./interfaces/IFareCalculator');
const IStationService = require('./interfaces/IStationService');

// Repositories
const FareRepository = require('./repositories/FareRepository');

// Services
const StationService = require('./services/StationService');
const FareService = require('./FareService');

// Calculators
const StationBasedFareCalculator = require('./calculators/StationBasedFareCalculator');
const PassBasedFareCalculator = require('./calculators/PassBasedFareCalculator');
const MultiRouteFareCalculator = require('./calculators/MultiRouteFareCalculator');

// Factory
const FareServiceFactory = require('./FareServiceFactory');

// Default export - create a configured instance
const createFareService = () => FareServiceFactory.createFareService();

module.exports = {
    // Interfaces
    IFareService,
    IFareCalculator,
    IStationService,
    
    // Repositories
    FareRepository,
    
    // Services
    StationService,
    FareService,
    
    // Calculators
    StationBasedFareCalculator,
    PassBasedFareCalculator,
    MultiRouteFareCalculator,
    
    // Factory
    FareServiceFactory,
    
    // Default instance
    createFareService,
    
    // Singleton instance (for backward compatibility)
    fareService: createFareService()
};
