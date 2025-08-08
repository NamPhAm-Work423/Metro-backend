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

  test('getStaffById filters by staffId', async () => {
    const mock = { id: '1' };
    Staff.findOne.mockResolvedValue(mock);
    const result = await staffService.getStaffById('s1');
    expect(Staff.findOne).toHaveBeenCalledWith({ where: { staffId: 's1' } });
    expect(result).toBe(mock);
  });

  test('updateStaff returns null when not found', async () => {
    Staff.findOne.mockResolvedValue(null);
    const result = await staffService.updateStaff('u1', { fullName: 'X' });
    expect(result).toBeNull();
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
});


