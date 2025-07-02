const staffController = require('../../../src/controllers/staff.controller');
const staffService = require('../../../src/services/staff.service');

// Mock staff service
jest.mock('../../../src/services/staff.service');

// Mock async error handler
jest.mock('../../../src/helpers/errorHandler.helper', () => {
  return jest.fn().mockImplementation((fn) => fn);
});

describe('Staff Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: { id: 'test-staff-id' },
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllStaff', () => {
    it('should return all staff successfully', async () => {
      const mockStaff = [
        { id: '1', fullName: 'Staff One' },
        { id: '2', fullName: 'Staff Two' }
      ];
      staffService.getAllStaff.mockResolvedValue(mockStaff);

      await staffController.getAllStaff(req, res, next);

      expect(staffService.getAllStaff).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Staff retrieved successfully',
        data: mockStaff,
        count: mockStaff.length
      });
    });
  });

  describe('getStaffById', () => {
    it('should return staff when found', async () => {
      const mockStaff = { id: '1', fullName: 'Staff One' };
      req.params.id = '1';
      staffService.getStaffById.mockResolvedValue(mockStaff);

      await staffController.getStaffById(req, res, next);

      expect(staffService.getStaffById).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Staff retrieved successfully',
        data: mockStaff
      });
    });

    it('should return 404 when staff not found', async () => {
      req.params.id = '999';
      staffService.getStaffById.mockResolvedValue(null);

      await staffController.getStaffById(req, res, next);

      expect(staffService.getStaffById).toHaveBeenCalledWith('999');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Staff not found'
      });
    });
  });

  describe('createStaff', () => {
    it('should create staff successfully', async () => {
      const mockStaff = { id: '1', fullName: 'New Staff' };
      req.body = {
        firstName: 'New',
        lastName: 'Staff',
        phoneNumber: '1234567890'
      };
      req.headers['x-user-id'] = 'user-123';
      
      staffService.getStaffByUserId.mockResolvedValue(null);
      staffService.createStaff.mockResolvedValue(mockStaff);

      await staffController.createStaff(req, res, next);

      expect(staffService.getStaffByUserId).toHaveBeenCalledWith('user-123');
      expect(staffService.createStaff).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Staff profile created successfully',
        data: mockStaff
      });
    });

    it('should return 409 when staff already exists', async () => {
      const existingStaff = { id: '1', userId: 'user-123' };
      req.headers['x-user-id'] = 'user-123';
      
      staffService.getStaffByUserId.mockResolvedValue(existingStaff);

      await staffController.createStaff(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Staff profile already exists'
      });
    });

    it('should handle validation errors', async () => {
      const validationError = {
        name: 'SequelizeValidationError',
        errors: [
          { path: 'firstName', message: 'First name is required' }
        ]
      };
      
      req.headers['x-user-id'] = 'user-123';
      staffService.getStaffByUserId.mockResolvedValue(null);
      staffService.createStaff.mockRejectedValue(validationError);

      await staffController.createStaff(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [{ field: 'firstName', message: 'First name is required' }]
      });
    });
  });

  describe('updateStaff', () => {
    it('should update staff successfully', async () => {
      const mockStaff = { id: '1', fullName: 'Updated Staff' };
      req.params.id = '1';
      req.body = { fullName: 'Updated Staff' };
      
      staffService.updateStaffById.mockResolvedValue(mockStaff);

      await staffController.updateStaff(req, res, next);

      expect(staffService.updateStaffById).toHaveBeenCalledWith('1', req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Staff updated successfully',
        data: mockStaff
      });
    });

    it('should return 404 when staff not found for update', async () => {
      req.params.id = '999';
      req.body = { fullName: 'Updated Name' };
      
      staffService.updateStaffById.mockResolvedValue(null);

      await staffController.updateStaff(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Staff not found'
      });
    });
  });

  describe('deleteStaff', () => {
    it('should delete staff successfully', async () => {
      req.params.id = '1';
      staffService.deleteStaffById.mockResolvedValue(true);

      await staffController.deleteStaff(req, res, next);

      expect(staffService.deleteStaffById).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Staff deleted successfully'
      });
    });

    it('should return 404 when staff not found for deletion', async () => {
      req.params.id = '999';
      staffService.deleteStaffById.mockResolvedValue(false);

      await staffController.deleteStaff(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Staff not found'
      });
    });
  });

  describe('updateStaffStatus', () => {
    it('should update staff status successfully', async () => {
      const mockStaff = { id: '1', isActive: false };
      req.params.id = '1';
      req.body = { isActive: false };
      
      staffService.updateStaffStatus.mockResolvedValue(mockStaff);

      await staffController.updateStaffStatus(req, res, next);

      expect(staffService.updateStaffStatus).toHaveBeenCalledWith('1', false);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Staff status updated successfully',
        data: mockStaff
      });
    });

    it('should return 400 when isActive is not boolean', async () => {
      req.params.id = '1';
      req.body = { isActive: 'not-boolean' };

      await staffController.updateStaffStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'isActive must be a boolean value'
      });
    });
  });

  describe('getMe', () => {
    it('should return current staff profile', async () => {
      const mockStaff = { id: '1', userId: 'test-staff-id' };
      staffService.getStaffByUserId.mockResolvedValue(mockStaff);

      await staffController.getMe(req, res, next);

      expect(staffService.getStaffByUserId).toHaveBeenCalledWith('test-staff-id');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStaff
      });
    });

    it('should return 404 when staff profile not found', async () => {
      staffService.getStaffByUserId.mockResolvedValue(null);

      await staffController.getMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Staff profile not found'
      });
    });
  });

  describe('updateMe', () => {
    it('should update current staff profile', async () => {
      const mockStaff = { id: '1', userId: 'test-staff-id', fullName: 'Updated' };
      req.body = { firstName: 'Updated', lastName: 'Name' };
      
      staffService.updateStaff.mockResolvedValue(mockStaff);

      await staffController.updateMe(req, res, next);

      expect(staffService.updateStaff).toHaveBeenCalledWith('test-staff-id', req.body);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Staff profile updated successfully',
        data: mockStaff
      });
    });

    it('should return 404 when staff profile not found for update', async () => {
      req.body = { firstName: 'Updated' };
      staffService.updateStaff.mockResolvedValue(null);

      await staffController.updateMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Staff profile not found'
      });
    });
  });

  describe('deleteMe', () => {
    it('should delete current staff profile', async () => {
      staffService.deleteStaffByUserId.mockResolvedValue(true);

      await staffController.deleteMe(req, res, next);

      expect(staffService.deleteStaffByUserId).toHaveBeenCalledWith('test-staff-id');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Staff profile deleted successfully'
      });
    });

    it('should return 400 when user ID not found', async () => {
      req.user = {};

      await staffController.deleteMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID not found in request'
      });
    });
  });
}); 