jest.mock('../../src/events/admin.producer.event', () => ({
  publishAdminUpdated: jest.fn().mockResolvedValue(),
}));

const adminEventProducer = require('../../src/events/admin.producer.event');
const models = require('../../src/models/index.model');
const { Admin } = models;
const adminService = require('../../src/services/admin.service');

describe('admin.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllAdmins returns list', async () => {
    const mockList = [{ id: '1' }, { id: '2' }];
    Admin.findAll.mockResolvedValue(mockList);

    const result = await adminService.getAllAdmins();
    expect(Admin.findAll).toHaveBeenCalled();
    expect(result).toEqual(mockList);
  });

  test('getAdminById finds by PK', async () => {
    const mock = { id: '1' };
    Admin.findByPk.mockResolvedValue(mock);
    const result = await adminService.getAdminById('1');
    expect(Admin.findByPk).toHaveBeenCalledWith('1');
    expect(result).toBe(mock);
  });

  test('getAdminByUserId finds one', async () => {
    const mock = { id: '1', userId: 'u1' };
    Admin.findOne.mockResolvedValue(mock);
    const result = await adminService.getAdminByUserId('u1');
    expect(Admin.findOne).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(result).toBe(mock);
  });

  test('updateAdminById returns null when not found', async () => {
    Admin.findByPk.mockResolvedValue(null);
    const result = await adminService.updateAdminById('missing', { fullName: 'X' });
    expect(result).toBeNull();
    expect(adminEventProducer.publishAdminUpdated).not.toHaveBeenCalled();
  });

  test('updateAdminById updates and publishes event', async () => {
    const instance = { update: jest.fn().mockResolvedValue(), id: '1' };
    Admin.findByPk.mockResolvedValue(instance);
    const payload = { fullName: 'Updated' };

    const result = await adminService.updateAdminById('1', payload);

    expect(Admin.findByPk).toHaveBeenCalledWith('1');
    expect(instance.update).toHaveBeenCalledWith(payload);
    expect(adminEventProducer.publishAdminUpdated).toHaveBeenCalledWith(instance);
    expect(result).toBe(instance);
  });
});


