jest.mock('../../src/events/staff.producer.event', () => ({
  publishStaffDeleted: jest.fn().mockResolvedValue(),
}));

const staffEventProducer = require('../../src/events/staff.producer.event');
const models = require('../../src/models/index.model');
const { Staff } = models;
const staffService = require('../../src/services/staff.service');

describe('staff.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllStaff returns list', async () => {
    const mockList = [{ id: '1' }];
    Staff.findAll.mockResolvedValue(mockList);
    const result = await staffService.getAllStaff();
    expect(Staff.findAll).toHaveBeenCalled();
    expect(result).toEqual(mockList);
  });

  test('getAllStaff propagates errors', async () => {
    Staff.findAll.mockRejectedValue(new Error('db'));
    await expect(staffService.getAllStaff()).rejects.toThrow('db');
  });

  test('getStaffById filters by staffId', async () => {
    const mock = { id: '1' };
    Staff.findOne.mockResolvedValue(mock);
    const result = await staffService.getStaffById('s1');
    expect(Staff.findOne).toHaveBeenCalledWith({ where: { staffId: 's1' } });
    expect(result).toBe(mock);
  });

  test('getStaffByUserId returns entity', async () => {
    const mock = { staffId: 's1', userId: 'u1' };
    Staff.findOne.mockResolvedValue(mock);
    const result = await staffService.getStaffByUserId('u1');
    expect(Staff.findOne).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(result).toBe(mock);
  });

  test('updateStaff returns null when not found', async () => {
    Staff.findOne.mockResolvedValue(null);
    const result = await staffService.updateStaff('u1', { fullName: 'X' });
    expect(result).toBeNull();
  });

  test('updateStaff propagates errors', async () => {
    Staff.findOne.mockRejectedValue(new Error('db'));
    await expect(staffService.updateStaff('u1', { x: 1 })).rejects.toThrow('db');
  });

  test('updateStaff updates and returns instance', async () => {
    const instance = { update: jest.fn().mockResolvedValue(), id: '1' };
    Staff.findOne.mockResolvedValue(instance);
    const result = await staffService.updateStaff('u1', { fullName: 'Y' });
    expect(Staff.findOne).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(instance.update).toHaveBeenCalledWith({ fullName: 'Y' });
    expect(result).toBe(instance);
  });

  test('updateStaffStatus returns updated instance', async () => {
    const instance = { update: jest.fn().mockResolvedValue(), id: '1' };
    Staff.findOne.mockResolvedValue(instance);
    const result = await staffService.updateStaffStatus('s1', false);
    expect(Staff.findOne).toHaveBeenCalledWith({ where: { staffId: 's1' } });
    expect(instance.update).toHaveBeenCalledWith({ isActive: false });
    expect(result).toBe(instance);
  });

  test('deleteStaffById publishes event and deletes', async () => {
    const instance = { destroy: jest.fn().mockResolvedValue(), staffId: 's1' };
    Staff.findOne.mockResolvedValue(instance);
    const result = await staffService.deleteStaffById('s1');
    expect(staffEventProducer.publishStaffDeleted).toHaveBeenCalledWith(instance);
    expect(instance.destroy).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('getStaffById propagates errors', async () => {
    Staff.findOne.mockRejectedValue(new Error('db'));
    await expect(staffService.getStaffById('s1')).rejects.toThrow('db');
  });

  test('getStaffByUserId propagates errors', async () => {
    Staff.findOne.mockRejectedValue(new Error('db'));
    await expect(staffService.getStaffByUserId('u1')).rejects.toThrow('db');
  });

  test('createStaff propagates errors', async () => {
    Staff.create.mockRejectedValue(new Error('db'));
    await expect(staffService.createStaff({})).rejects.toThrow('db');
  });

  test('createStaff returns created instance', async () => {
    const payload = { userId: 'u1', fullName: 'X' };
    const created = { staffId: 's1', ...payload };
    Staff.create.mockResolvedValue(created);
    const result = await staffService.createStaff(payload);
    expect(Staff.create).toHaveBeenCalledWith(payload);
    expect(result).toBe(created);
  });

  test('updateStaffById returns null when not found', async () => {
    Staff.findOne.mockResolvedValue(null);
    const result = await staffService.updateStaffById('s1', { x: 1 });
    expect(result).toBeNull();
  });

  test('updateStaffById propagates errors', async () => {
    Staff.findOne.mockRejectedValue(new Error('db'));
    await expect(staffService.updateStaffById('s1', { x: 1 })).rejects.toThrow('db');
  });

  test('updateStaffById updates and returns instance', async () => {
    const instance = { update: jest.fn().mockResolvedValue(), staffId: 's1' };
    Staff.findOne.mockResolvedValue(instance);
    const result = await staffService.updateStaffById('s1', { fullName: 'X' });
    expect(Staff.findOne).toHaveBeenCalledWith({ where: { staffId: 's1' } });
    expect(instance.update).toHaveBeenCalledWith({ fullName: 'X' });
    expect(result).toBe(instance);
  });

  test('updateStaffStatus returns null when not found', async () => {
    Staff.findOne.mockResolvedValue(null);
    const result = await staffService.updateStaffStatus('s1', true);
    expect(result).toBeNull();
  });

  test('deleteStaffByUserId propagates errors', async () => {
    Staff.findOne.mockRejectedValue(new Error('db'));
    await expect(staffService.deleteStaffByUserId('u1')).rejects.toThrow('db');
  });

  test('updateStaffStatus propagates errors', async () => {
    Staff.findOne.mockRejectedValue(new Error('db'));
    await expect(staffService.updateStaffStatus('s1', true)).rejects.toThrow('db');
  });

  test('deleteStaffById returns false when not found', async () => {
    Staff.findOne.mockResolvedValue(null);
    const result = await staffService.deleteStaffById('s1');
    expect(result).toBe(false);
  });

  test('deleteStaffById propagates errors', async () => {
    const instance = { destroy: jest.fn().mockRejectedValue(new Error('destroy-fail')) };
    Staff.findOne.mockResolvedValue(instance);
    await expect(staffService.deleteStaffById('s1')).rejects.toThrow('destroy-fail');
  });

  test('deleteStaffByUserId returns true when deleted', async () => {
    const instance = { destroy: jest.fn().mockResolvedValue(1), userId: 'u1' };
    Staff.findOne.mockResolvedValue(instance);
    const result = await staffService.deleteStaffByUserId('u1');
    expect(result).toBe(true);
  });
});


