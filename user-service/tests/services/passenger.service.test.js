jest.mock('../../src/events/passenger.producer.event', () => ({
  publishPassengerDeleted: jest.fn().mockResolvedValue(),
}));

// Mock Redis client provider
jest.mock('../../src/config/redis', () => ({
  getClient: jest.fn(() => ({
    multi: () => ({ set: jest.fn(), expire: jest.fn(), exec: jest.fn().mockResolvedValue([[null, 'OK']]) }),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn()
  }))
}));

// Mock cache service as a constructor that returns a shared spy object,
// and also expose the spies on the module for easy assertions
const mockCacheSpies = {
  setPassenger: jest.fn().mockResolvedValue(),
  removePassenger: jest.fn().mockResolvedValue()
};
jest.mock('../../src/services/cache/PassengerCacheService', () => {
  const MockClass = jest.fn().mockImplementation(() => mockCacheSpies);
  MockClass.setPassenger = mockCacheSpies.setPassenger;
  MockClass.removePassenger = mockCacheSpies.removePassenger;
  return MockClass;
});

const passengerEventProducer = require('../../src/events/passenger.producer.event');
const PassengerCacheService = require('../../src/services/cache/PassengerCacheService');
const models = require('../../src/models/index.model');
const { Passenger } = models;
const passengerService = require('../../src/services/passenger.service');

describe('passenger.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllPassengers returns list', async () => {
    const mockList = [{ id: '1' }];
    Passenger.findAll.mockResolvedValue(mockList);
    const result = await passengerService.getAllPassengers();
    expect(Passenger.findAll).toHaveBeenCalled();
    expect(result).toEqual(mockList);
  });

  test('getAllPassengers propagates errors', async () => {
    Passenger.findAll.mockRejectedValue(new Error('db'));
    await expect(passengerService.getAllPassengers()).rejects.toThrow('db');
  });

  test('getPassengerById filters by passengerId and isActive', async () => {
    const mock = { id: '1' };
    Passenger.findOne.mockResolvedValue(mock);
    const result = await passengerService.getPassengerById('p1');
    expect(Passenger.findOne).toHaveBeenCalledWith({ where: { passengerId: 'p1', isActive: true } });
    expect(result).toBe(mock);
  });

  test('createPassenger calls create and logs', async () => {
    const payload = { userId: 'u1', firstName: 'A' };
    const created = { id: '1', ...payload };
    Passenger.create.mockResolvedValue(created);
    const result = await passengerService.createPassenger(payload);
    expect(Passenger.create).toHaveBeenCalledWith(payload);
    expect(result).toBe(created);
  });

  test('updatePassenger returns null when not found', async () => {
    Passenger.findOne.mockResolvedValue(null);
    const result = await passengerService.updatePassenger('u1', { fullName: 'X' });
    expect(result).toBeNull();
  });

  test('updatePassenger propagates errors', async () => {
    Passenger.findOne.mockRejectedValue(new Error('db'));
    await expect(passengerService.updatePassenger('u1', { x: 1 })).rejects.toThrow('db');
  });

  test('updatePassenger updates and returns instance', async () => {
    const instance = { update: jest.fn().mockResolvedValue(), id: '1' };
    Passenger.findOne.mockResolvedValue(instance);
    const result = await passengerService.updatePassenger('u1', { fullName: 'Y' });
    expect(Passenger.findOne).toHaveBeenCalledWith({ where: { userId: 'u1', isActive: true } });
    expect(instance.update).toHaveBeenCalledWith({ fullName: 'Y' });
    expect(PassengerCacheService.setPassenger).toHaveBeenCalledWith(instance);
    expect(result).toBe(instance);
  });

  test('updatePassengerById returns updated instance', async () => {
    const instance = { update: jest.fn().mockResolvedValue(), id: '1' };
    Passenger.findOne.mockResolvedValue(instance);
    const result = await passengerService.updatePassengerById('p1', { v: 1 });
    expect(Passenger.findOne).toHaveBeenCalledWith({ where: { passengerId: 'p1', isActive: true } });
    expect(instance.update).toHaveBeenCalledWith({ v: 1 });
    expect(PassengerCacheService.setPassenger).toHaveBeenCalledWith(instance);
    expect(result).toBe(instance);
  });

  test('updatePassengerById propagates errors', async () => {
    Passenger.findOne.mockRejectedValue(new Error('db'));
    await expect(passengerService.updatePassengerById('p1', { x: 1 })).rejects.toThrow('db');
  });

  test('deletePassengerByUserId publishes event and deletes', async () => {
    const instance = { 
      destroy: jest.fn().mockResolvedValue(), 
      userId: 'u1', 
      passengerId: 'p1', 
      email: 'test@example.com' 
    };
    Passenger.findOne.mockResolvedValue(instance);
    const result = await passengerService.deletePassengerByUserId('u1');
    expect(Passenger.findOne).toHaveBeenCalledWith({ where: { userId: 'u1', isActive: true } });
    expect(passengerEventProducer.publishPassengerDeleted).toHaveBeenCalledWith(instance);
    expect(instance.destroy).toHaveBeenCalled();
    expect(PassengerCacheService.removePassenger).toHaveBeenCalledWith('p1', 'u1', 'test@example.com');
    expect(result).toEqual({ success: true, message: 'Passenger profile deleted successfully' });
  });

  test('deletePassengerByUserId propagates errors', async () => {
    Passenger.findOne.mockRejectedValue(new Error('db'));
    await expect(passengerService.deletePassengerByUserId('u1')).rejects.toThrow('db');
  });

  test('getPassengerById propagates errors', async () => {
    Passenger.findOne.mockRejectedValue(new Error('db'));
    await expect(passengerService.getPassengerById('p1')).rejects.toThrow('db');
  });

  test('getPassengerByUserId propagates errors', async () => {
    Passenger.findOne.mockRejectedValue(new Error('db'));
    await expect(passengerService.getPassengerByUserId('u1')).rejects.toThrow('db');
  });

  test('createPassenger propagates errors', async () => {
    Passenger.create.mockRejectedValue(new Error('db'));
    await expect(passengerService.createPassenger({})).rejects.toThrow('db');
  });

  test('updatePassengerById returns null when not found', async () => {
    Passenger.findOne.mockResolvedValue(null);
    const result = await passengerService.updatePassengerById('p1', { x: 1 });
    expect(result).toBeNull();
  });

  test('deletePassengerById returns false when not found', async () => {
    Passenger.findOne.mockResolvedValue(null);
    const result = await passengerService.deletePassengerById('p1');
    expect(result).toBe(false);
  });

  test('deletePassengerById propagates errors', async () => {
    const instance = { destroy: jest.fn().mockRejectedValue(new Error('destroy-fail')) };
    Passenger.findOne.mockResolvedValue(instance);
    await expect(passengerService.deletePassengerById('p1')).rejects.toThrow('destroy-fail');
  });

  test('deletePassengerById returns true when deleted', async () => {
    const instance = { 
      destroy: jest.fn().mockResolvedValue(1), 
      passengerId: 'p1', 
      userId: 'u1', 
      email: 'test@example.com' 
    };
    Passenger.findOne.mockResolvedValue(instance);
    const result = await passengerService.deletePassengerById('p1');
    expect(passengerEventProducer.publishPassengerDeleted).toHaveBeenCalledWith(instance);
    expect(instance.destroy).toHaveBeenCalled();
    expect(PassengerCacheService.removePassenger).toHaveBeenCalledWith('p1', 'u1', 'test@example.com');
    expect(result).toBe(true);
  });

  test('syncPassengerCacheForUser returns false when passenger not found', async () => {
    jest.spyOn(passengerService, 'getPassengerByUserId').mockResolvedValue(null);
    const ok = await passengerService.syncPassengerCacheForUser('u1');
    expect(ok).toBe(false);
  });

  test('syncPassengerCacheForUser sets cache and returns true', async () => {
    const found = {
      passengerId: 'p1',
      userId: 'u1',
      firstName: 'A',
      lastName: 'B',
      phoneNumber: '123',
      email: 'e@example.com',
      dateOfBirth: '2000-01-01',
      gender: 'M'
    };
    jest.spyOn(passengerService, 'getPassengerByUserId').mockResolvedValue(found);

    const ok = await passengerService.syncPassengerCacheForUser('u1');

    expect(PassengerCacheService.setPassenger).toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  test('setPassengerCache returns true and calls cache.setPassenger', async () => {
    const payload = { passengerId: 'p9', userId: 'u9' };
    const ok = await passengerService.setPassengerCache(payload);
    expect(PassengerCacheService.setPassenger).toHaveBeenCalledWith(payload);
    expect(ok).toBe(true);
  });
});


