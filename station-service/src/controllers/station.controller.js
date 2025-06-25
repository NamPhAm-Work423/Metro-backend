const stationService = require('../services/station.service');
const { validationResult } = require('express-validator');

// Helper function for handling async errors
const asyncErrorHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper function to get user ID from request
const getUserId = (req) => {
    return req.user?.id || req.headers['x-user-id'] || null;
};

// ============================================
// PUBLIC/PASSENGER ENDPOINTS
// ============================================

// GET /v1/stations (Public - for passengers)
const getAllStations = asyncErrorHandler(async (req, res, next) => {
    const options = {
        isActive: true, // Only active stations for passengers
        limit: req.query.limit,
        offset: req.query.offset,
        sortBy: req.query.sortBy || 'stationName',
        sortOrder: req.query.sortOrder || 'ASC'
    };

    const stations = await stationService.getAllStations(options);
    
    res.status(200).json({ 
        success: true,
        message: 'Stations retrieved successfully', 
        data: stations,
        count: stations.length
    });
});

// GET /v1/stations/:id (Public - for passengers)
const getStationById = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const station = await stationService.getStationById(id);
    
    if (!station) {
        return res.status(404).json({
            success: false,
            message: 'Station not found'
        });
    }
    
    res.status(200).json({
        success: true,
        message: 'Station retrieved successfully',
        data: station
    });
});

// GET /v1/stations/code/:code (Public - for passengers)
const getStationByCode = asyncErrorHandler(async (req, res, next) => {
    const { code } = req.params;
    const station = await stationService.getStationByCode(code);
    
    if (!station) {
        return res.status(404).json({
            success: false,
            message: 'Station not found'
        });
    }
    
    res.status(200).json({
        success: true,
        message: 'Station retrieved successfully',
        data: station
    });
});

// GET /v1/stations/search (Public - for passengers)
const searchStations = asyncErrorHandler(async (req, res, next) => {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Search query parameter "q" is required'
        });
    }
    
    const stations = await stationService.searchStations(q.trim());
    
    res.status(200).json({
        success: true,
        message: 'Search results retrieved successfully',
        data: stations,
        count: stations.length
    });
});

// GET /v1/stations/facility/:facility (Public - for passengers)
const getStationsWithFacility = asyncErrorHandler(async (req, res, next) => {
    const { facility } = req.params;
    const stations = await stationService.getStationsWithFacility(facility);
    
    res.status(200).json({
        success: true,
        message: `Stations with ${facility} retrieved successfully`,
        data: stations,
        count: stations.length
    });
});

// ============================================
// ROUTE SERVICE ENDPOINTS (Internal API)
// ============================================

// GET /v1/stations/route/all (Route service - includes inactive stations)
const getAllStationsForRoute = asyncErrorHandler(async (req, res, next) => {
    const options = {
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        limit: req.query.limit,
        offset: req.query.offset,
        sortBy: req.query.sortBy || 'stationName',
        sortOrder: req.query.sortOrder || 'ASC'
    };

    const stations = await stationService.getAllStations(options);
    
    res.status(200).json({ 
        success: true,
        message: 'All stations retrieved for route service', 
        data: stations,
        count: stations.length
    });
});

// GET /v1/stations/route/bulk (Route service - get multiple stations by IDs)
const getStationsByIds = asyncErrorHandler(async (req, res, next) => {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Station IDs array is required'
        });
    }
    
    const stations = await stationService.getStationsByIds(ids);
    
    res.status(200).json({
        success: true,
        message: 'Stations retrieved successfully',
        data: stations,
        count: stations.length
    });
});

// PATCH /v1/stations/route/:id/status (Route service - update station status)
const updateStationStatus = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { isActive, reason } = req.body;
    const userId = getUserId(req);
    
    if (typeof isActive !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: 'isActive must be a boolean value'
        });
    }
    
    const station = await stationService.updateStation(id, { isActive, reason }, false, userId);
    
    if (!station) {
        return res.status(404).json({
            success: false,
            message: 'Station not found'
        });
    }
    
    res.status(200).json({
        success: true,
        message: `Station ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: station
    });
});

// ============================================
// ADMIN ENDPOINTS (Full CRUD access)
// ============================================

// GET /v1/stations/admin/all (Admin - all stations including inactive)
const getAllStationsAdmin = asyncErrorHandler(async (req, res, next) => {
    const options = {
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        limit: req.query.limit,
        offset: req.query.offset,
        sortBy: req.query.sortBy || 'stationName',
        sortOrder: req.query.sortOrder || 'ASC'
    };

    const stations = await stationService.getAllStations(options);
    
    res.status(200).json({ 
        success: true,
        message: 'All stations retrieved for admin', 
        data: stations,
        count: stations.length
    });
});

// POST /v1/stations/admin (Admin - create new station)
const createStation = asyncErrorHandler(async (req, res, next) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const stationData = req.body;
    const userId = getUserId(req);
    const station = await stationService.createStation(stationData, userId);
    
    res.status(201).json({ 
        success: true, 
        message: 'Station created successfully',
        data: station 
    });
});

// PUT /v1/stations/admin/:id (Admin - update station)
const updateStation = asyncErrorHandler(async (req, res, next) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const { id } = req.params;
    const updateData = req.body;
    const userId = getUserId(req);
    
    const station = await stationService.updateStation(id, updateData, false, userId);
    
    if (!station) {
        return res.status(404).json({
            success: false,
            message: 'Station not found'
        });
    }
    
    res.status(200).json({
        success: true,
        message: 'Station updated successfully',
        data: station
    });
});

// DELETE /v1/stations/admin/:id (Admin - soft delete station)
const deleteStation = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = getUserId(req);
    
    const result = await stationService.deleteStation(id, userId);
    
    if (!result) {
        return res.status(404).json({
            success: false,
            message: 'Station not found'
        });
    }
    
    res.status(200).json({
        success: true,
        message: 'Station deleted successfully'
    });
});

// GET /v1/stations/admin/:id (Admin - get station details including inactive)
const getStationByIdAdmin = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const includeInactive = true; // Admin can see inactive stations
    const station = await stationService.getStationById(id, includeInactive);
    
    if (!station) {
        return res.status(404).json({
            success: false,
            message: 'Station not found'
        });
    }
    
    res.status(200).json({
        success: true,
        message: 'Station retrieved successfully',
        data: station
    });
});

// PATCH /v1/stations/admin/:id/restore (Admin - restore soft deleted station)
const restoreStation = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = getUserId(req);
    
    const station = await stationService.updateStation(id, { isActive: true }, true, userId); // Allow update of inactive stations
    
    if (!station) {
        return res.status(404).json({
            success: false,
            message: 'Station not found'
        });
    }
    
    res.status(200).json({
        success: true,
        message: 'Station restored successfully',
        data: station
    });
});

module.exports = {
    // Public/Passenger endpoints
    getAllStations,
    getStationById,
    getStationByCode,
    searchStations,
    getStationsWithFacility,
    
    // Route service endpoints
    getAllStationsForRoute,
    getStationsByIds,
    updateStationStatus,
    
    // Admin endpoints
    getAllStationsAdmin,
    createStation,
    updateStation,
    deleteStation,
    getStationByIdAdmin,
    restoreStation
}; 