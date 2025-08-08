const passengerController = require('../../../src/controllers/passenger.controller');
const passengerService = require('../../../src/services/passenger.service');
const passengerProducer = require('../../../src/events/passenger.producer.event');

// Mock passenger service
jest.mock('../../../src/services/passenger.service');

// Mock async error handler
jest.mock('../../../src/helpers/errorHandler.helper', () => {
  return jest.fn().mockImplementation((fn) => fn);
});

describe('Passenger Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: { id: 'test-user-id' },
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
    // Stub producer to avoid side effects in syncPassenger
    if (passengerProducer && passengerProducer.publishPassengerCacheSync) {
      jest.spyOn(passengerProducer, 'publishPassengerCacheSync').mockResolvedValue();
    }
  });

  describe('getAllPassengers', () => {
    it('should return all passengers successfully', async () => {
      const mockPassengers = [
        { id: '1', fullName: 'John Doe' },
        { id: '2', fullName: 'Jane Smith' }
      ];
      passengerService.getAllPassengers.mockResolvedValue(mockPassengers);

      await passengerController.getAllPassengers(req, res, next);

      expect(passengerService.getAllPassengers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Passengers retrieved successfully',
        data: mockPassengers,
        count: mockPassengers.length
      });
    });
  });

  describe('getPassengerById', () => {
    it('should return passenger when found', async () => {
      const mockPassenger = { id: '1', fullName: 'John Doe' };
      req.params.id = '1';
      passengerService.getPassengerById.mockResolvedValue(mockPassenger);

      await passengerController.getPassengerById(req, res, next);

      expect(passengerService.getPassengerById).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Passenger retrieved successfully',
        data: mockPassenger
      });
    });

    it('should return 404 when passenger not found', async () => {
      req.params.id = '999';
      passengerService.getPassengerById.mockResolvedValue(null);

      await passengerController.getPassengerById(req, res, next);

      expect(passengerService.getPassengerById).toHaveBeenCalledWith('999');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Passenger not found'
      });
    });
  });

  describe('createPassenger', () => {
    it('should create passenger successfully', async () => {
      const mockPassenger = { id: '1', fullName: 'John Doe' };
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234567890',
        email: 'john@example.com'
      };
      req.headers['x-user-id'] = 'user-123';
      
      passengerService.getPassengerByUserId.mockResolvedValue(null);
      passengerService.createPassenger.mockResolvedValue(mockPassenger);

      await passengerController.createPassenger(req, res, next);

      expect(passengerService.getPassengerByUserId).toHaveBeenCalledWith('user-123');
      expect(passengerService.createPassenger).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Passenger profile created successfully',
        data: mockPassenger
      });
    });

    it('should return 409 when passenger already exists', async () => {
      const existingPassenger = { id: '1', userId: 'user-123' };
      req.headers['x-user-id'] = 'user-123';
      
      passengerService.getPassengerByUserId.mockResolvedValue(existingPassenger);

      await passengerController.createPassenger(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Passenger profile already exists'
      });
    });

    it('should handle validation errors', async () => {
      const validationError = {
        name: 'SequelizeValidationError',
        errors: [
          { path: 'email', message: 'Email is required' }
        ]
      };
      
      req.headers['x-user-id'] = 'user-123';
      passengerService.getPassengerByUserId.mockResolvedValue(null);
      passengerService.createPassenger.mockRejectedValue(validationError);

      await passengerController.createPassenger(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [{ field: 'email', message: 'Email is required' }]
      });
    });

    it('should pass non-validation errors to next', async () => {
      req.headers['x-user-id'] = 'user-123';
      passengerService.getPassengerByUserId.mockResolvedValue(null);
      const err = new Error('unexpected');
      passengerService.createPassenger.mockRejectedValue(err);

      await passengerController.createPassenger(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('updatePassenger', () => {
    it('should update passenger successfully', async () => {
      const mockPassenger = { id: '1', fullName: 'John Updated' };
      req.params.id = '1';
      req.body = { fullName: 'John Updated' };
      
      passengerService.updatePassengerById.mockResolvedValue(mockPassenger);

      await passengerController.updatePassenger(req, res, next);

      expect(passengerService.updatePassengerById).toHaveBeenCalledWith('1', req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Passenger updated successfully',
        data: mockPassenger
      });
    });

    it('should return 404 when passenger not found for update', async () => {
      req.params.id = '999';
      req.body = { fullName: 'Updated Name' };
      
      passengerService.updatePassengerById.mockResolvedValue(null);

      await passengerController.updatePassenger(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Passenger not found'
      });
    });
  });

  describe('deletePassenger', () => {
    it('should delete passenger successfully', async () => {
      req.params.id = '1';
      passengerService.deletePassengerById.mockResolvedValue(true);

      await passengerController.deletePassenger(req, res, next);

      expect(passengerService.deletePassengerById).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Passenger deleted successfully'
      });
    });

    it('should return 404 when passenger not found for deletion', async () => {
      req.params.id = '999';
      passengerService.deletePassengerById.mockResolvedValue(false);

      await passengerController.deletePassenger(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Passenger not found'
      });
    });

    it('should reject when service throws (handled by async error wrapper in real code)', async () => {
      req.params.id = '1';
      const err = new Error('db');
      passengerService.deletePassengerById.mockRejectedValue(err);
      await expect(passengerController.deletePassenger(req, res, next)).rejects.toThrow('db');
    });
  });

  describe('getMe', () => {
    it('should return current passenger profile', async () => {
      const mockPassenger = { id: '1', userId: 'test-user-id' };
      passengerService.getPassengerByUserId.mockResolvedValue(mockPassenger);

      await passengerController.getMe(req, res, next);

      expect(passengerService.getPassengerByUserId).toHaveBeenCalledWith('test-user-id');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockPassenger
      });
    });

    it('should return 404 when passenger profile not found', async () => {
      passengerService.getPassengerByUserId.mockResolvedValue(null);

      await passengerController.getMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Passenger profile not found'
      });
    });

    it('should pass errors to next', async () => {
      const err = new Error('db');
      passengerService.getPassengerByUserId.mockRejectedValue(err);
      await passengerController.getMe(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('updateMe', () => {
    it('should update current passenger profile', async () => {
      const mockPassenger = { id: '1', userId: 'test-user-id', fullName: 'Updated' };
      req.body = { firstName: 'Updated', lastName: 'Name' };
      
      passengerService.updatePassenger.mockResolvedValue(mockPassenger);

      await passengerController.updateMe(req, res, next);

      expect(passengerService.updatePassenger).toHaveBeenCalledWith('test-user-id', req.body);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Passenger profile updated successfully',
        data: mockPassenger
      });
    });

    it('should return 404 when passenger profile not found for update', async () => {
      req.body = { firstName: 'Updated' };
      passengerService.updatePassenger.mockResolvedValue(null);

      await passengerController.updateMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Passenger profile not found'
      });
    });

    it('should return 400 on validation error', async () => {
      req.body = { firstName: '' };
      const validationError = { name: 'SequelizeValidationError', errors: [{ path: 'firstName', message: 'Required' }] };
      passengerService.updatePassenger.mockRejectedValue(validationError);

      await passengerController.updateMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: [{ field: 'firstName', message: 'Required' }]
      });
    });
  });

  describe('deleteMe', () => {
    it('should delete current passenger profile', async () => {
      const mockResult = { message: 'Profile deleted successfully' };
      passengerService.deletePassengerByUserId.mockResolvedValue(mockResult);

      await passengerController.deleteMe(req, res, next);

      expect(passengerService.deletePassengerByUserId).toHaveBeenCalledWith('test-user-id');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: mockResult.message,
        data: mockResult
      });
    });

    it('should return 400 when user ID not found', async () => {
      req.user = {};

      await passengerController.deleteMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID not found in request'
      });
    });
  });

  describe('syncPassenger', () => {
    it('should publish cache sync when passenger exists', async () => {
      req.user = { id: 'u1' };
      const passenger = { passengerId: 'p1' };
      passengerService.getPassengerByUserId.mockResolvedValue(passenger);

      await passengerController.syncPassenger(req, res, next);

      expect(passengerService.getPassengerByUserId).toHaveBeenCalledWith('u1');
      if (passengerProducer && passengerProducer.publishPassengerCacheSync) {
        expect(passengerProducer.publishPassengerCacheSync).toHaveBeenCalledWith(passenger);
      }
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when passenger not found', async () => {
      req.user = { id: 'u1' };
      passengerService.getPassengerByUserId.mockResolvedValue(null);

      await passengerController.syncPassenger(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Passenger profile not found'
      });
    });

    it('should return 400 when missing user id', async () => {
      req.user = {};
      await passengerController.syncPassenger(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID not found in request'
      });
    });
  });

  describe('deletePassengerById', () => {
    it('should return 200 and success message', async () => {
      req.params.id = 'p1';
      passengerService.deletePassengerById.mockResolvedValue(true);

      await passengerController.deletePassengerById(req, res, next);

      expect(passengerService.deletePassengerById).toHaveBeenCalledWith('p1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Passenger deleted successfully',
        data: true
      });
    });
  });
}); 