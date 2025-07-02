const adminController = require('../../../src/controllers/admin.controller');
const adminService = require('../../../src/services/admin.service');

// Mock admin service
jest.mock('../../../src/services/admin.service');

// Mock async error handler
jest.mock('../../../src/helpers/errorHandler.helper', () => {
  return jest.fn().mockImplementation((fn) => fn);
});

describe('Admin Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: { id: 'test-admin-id' },
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllAdmins', () => {
    it('should return all admins successfully', async () => {
      const mockAdmins = [
        { id: '1', fullName: 'Admin One' },
        { id: '2', fullName: 'Admin Two' }
      ];
      adminService.getAllAdmins.mockResolvedValue(mockAdmins);

      await adminController.getAllAdmins(req, res, next);

      expect(adminService.getAllAdmins).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Admins retrieved successfully',
        data: mockAdmins,
        count: mockAdmins.length
      });
    });
  });

  describe('getAdminById', () => {
    it('should return admin when found', async () => {
      const mockAdmin = { id: '1', fullName: 'Admin One' };
      req.params.id = '1';
      adminService.getAdminById.mockResolvedValue(mockAdmin);

      await adminController.getAdminById(req, res, next);

      expect(adminService.getAdminById).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Admin retrieved successfully',
        data: mockAdmin
      });
    });

    it('should return 404 when admin not found', async () => {
      req.params.id = '999';
      adminService.getAdminById.mockResolvedValue(null);

      await adminController.getAdminById(req, res, next);

      expect(adminService.getAdminById).toHaveBeenCalledWith('999');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin not found'
      });
    });
  });

  describe('updateAdmin', () => {
    it('should update admin successfully', async () => {
      const mockAdmin = { id: '1', fullName: 'Updated Admin' };
      req.params.id = '1';
      req.body = { fullName: 'Updated Admin' };
      
      adminService.updateAdminById.mockResolvedValue(mockAdmin);

      await adminController.updateAdmin(req, res, next);

      expect(adminService.updateAdminById).toHaveBeenCalledWith('1', req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Admin updated successfully',
        data: mockAdmin
      });
    });

    it('should return 404 when admin not found for update', async () => {
      req.params.id = '999';
      req.body = { fullName: 'Updated Name' };
      
      adminService.updateAdminById.mockResolvedValue(null);

      await adminController.updateAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin not found'
      });
    });
  });

  describe('getMe', () => {
    it('should return current admin profile', async () => {
      const mockAdmin = { id: '1', userId: 'test-admin-id' };
      adminService.getAdminByUserId.mockResolvedValue(mockAdmin);

      await adminController.getMe(req, res, next);

      expect(adminService.getAdminByUserId).toHaveBeenCalledWith('test-admin-id');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAdmin
      });
    });

    it('should return 404 when admin profile not found', async () => {
      adminService.getAdminByUserId.mockResolvedValue(null);

      await adminController.getMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Admin profile not found'
      });
    });

    it('should handle errors with next function', async () => {
      const error = new Error('Database error');
      adminService.getAdminByUserId.mockRejectedValue(error);

      await adminController.getMe(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
}); 