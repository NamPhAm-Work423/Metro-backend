jest.mock('../../src/events/passenger.producer.event', () => ({
  publishPassengerDeleted: jest.fn().mockResolvedValue(),
}));

const passengerEventProducer = require('../../src/events/passenger.producer.event');
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

  test('updatePassengerById returns updated instance', async () => {
    const instance = { update: jest.fn().mockResolvedValue(), id: '1' };
    Passenger.findOne.mockResolvedValue(instance);
    const result = await passengerService.updatePassengerById('p1', { v: 1 });
    expect(Passenger.findOne).toHaveBeenCalledWith({ where: { passengerId: 'p1', isActive: true } });
    expect(instance.update).toHaveBeenCalledWith({ v: 1 });
    expect(result).toBe(instance);
  });

  test('deletePassengerByUserId publishes event and deletes', async () => {
    const instance = { destroy: jest.fn().mockResolvedValue(), userId: 'u1' };
    Passenger.findOne.mockResolvedValue(instance);
    const result = await passengerService.deletePassengerByUserId('u1');
    expect(passengerEventProducer.publishPassengerDeleted).toHaveBeenCalledWith(instance);
    expect(instance.destroy).toHaveBeenCalled();
    expect(result).toEqual({ success: true, message: 'Passenger profile deleted successfully' });
  });
});


