jest.mock('../../../src/models/index.model', () => ({
  Service: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
  ServiceInstance: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    bulkCreate: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  }
}));

// Mock redis module used by loadBalancer.service to provide withRedisClient
jest.mock('../../../src/config/redis', () => ({
  withRedisClient: async (fn) => {
    const client = {
      multi: () => ({
        zRem: () => {},
        del: () => {},
        exec: async () => []
      }),
      zRange: async () => [],
    };
    return fn(client);
  }
}));

const { Service, ServiceInstance } = require('../../../src/models/index.model');
const svc = require('../../../src/services/service.service');

describe('service.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('findServiceById delegates to Service.findOne', async () => {
    Service.findOne.mockResolvedValue({ id: 1 });
    const res = await svc.findServiceById(1);
    expect(res).toEqual({ id: 1 });
    expect(Service.findOne).toHaveBeenCalled();
  });

  test('findServiceByName delegates to Service.findOne', async () => {
    Service.findOne.mockResolvedValue({ name: 'X' });
    await svc.findServiceByName('X');
    expect(Service.findOne).toHaveBeenCalled();
  });

  test('findServiceByEndPoint delegates to Service.findOne', async () => {
    Service.findOne.mockResolvedValue({ endPoint: 'tickets' });
    await svc.findServiceByEndPoint('tickets');
    expect(Service.findOne).toHaveBeenCalled();
  });

  test('findServiceInstanceEndPoint queries ServiceInstance with include', async () => {
    ServiceInstance.findOne.mockResolvedValue({ id: 'i1' });
    const res = await svc.findServiceInstanceEndPoint('tickets');
    expect(res).toEqual({ id: 'i1' });
    expect(ServiceInstance.findOne).toHaveBeenCalled();
  });

  test('findInstancesByServiceId returns instances', async () => {
    ServiceInstance.findAll.mockResolvedValue([{ id: 'i1' }]);
    const res = await svc.findInstancesByServiceId(1);
    expect(res.length).toBe(1);
  });

  test('createService creates a row', async () => {
    Service.create.mockResolvedValue({ id: 9 });
    const res = await svc.createService('Name', 'ep');
    expect(res.id).toBe(9);
  });

  test('createBulkInstances delegates to bulkCreate', async () => {
    await svc.createBulkInstances([{ id: 'i' }]);
    expect(ServiceInstance.bulkCreate).toHaveBeenCalled();
  });

  test('deleteService deletes instances and service', async () => {
    Service.findOne.mockResolvedValue({ id: 1, endPoint: 'ep', name: 'Name' });
    ServiceInstance.destroy.mockResolvedValue(2);
    Service.destroy.mockResolvedValue(1);
    jest.spyOn(require('../../../src/services/loadBalancer.service'), 'deleteServiceFromRedis').mockResolvedValue();
    await svc.deleteService('Name');
    expect(ServiceInstance.destroy).toHaveBeenCalled();
    expect(Service.destroy).toHaveBeenCalled();
  });

  test('createNewInstance creates instance with generated id', async () => {
    ServiceInstance.findAll.mockResolvedValue([{ id: 'i0' }]);
    Service.findOne.mockResolvedValue({ name: 'S' });
    await svc.createNewInstance(1, 'h', 80);
    expect(ServiceInstance.create).toHaveBeenCalled();
  });

  test('deleteInstance removes by id and in redis', async () => {
    ServiceInstance.findOne.mockResolvedValue({ id: 'i', serviceId: 1 });
    Service.findOne.mockResolvedValue({ endPoint: 'ep' });
    jest.spyOn(require('../../../src/services/loadBalancer.service'), 'deleteInstanceFromRedis').mockResolvedValue();
    await svc.deleteInstance('i');
    expect(ServiceInstance.destroy).toHaveBeenCalled();
  });

  test('getAllService returns list with instances', async () => {
    Service.findAll.mockResolvedValue([{ id: 1 }]);
    const res = await svc.getAllService();
    expect(res.length).toBe(1);
  });

  test('getServiceByName returns service', async () => {
    Service.findOne.mockResolvedValue({ id: 1, name: 'N' });
    const res = await svc.getServiceByName('N');
    expect(res.id).toBe(1);
  });
});


