jest.mock('../../../src/helpers/errorHandler.helper', () => (fn) => (req, res, next) => fn(req, res, next));
jest.mock('../../../src/services/service.service', () => ({
  findServiceById: jest.fn(),
  findServiceByName: jest.fn(),
  findServiceByEndPoint: jest.fn(),
  findServiceInstanceEndPoint: jest.fn(),
  findInstancesByServiceId: jest.fn(),
  createService: jest.fn(),
  createBulkInstances: jest.fn(),
  deleteService: jest.fn(),
  createNewService: jest.fn(),
  createNewInstance: jest.fn(),
}));
jest.mock('../../../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const serviceController = require('../../../src/controllers/service.controller');
const mockedServiceService = require('../../../src/services/service.service');

function makeRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('service.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('findServiceById returns 200', async () => {
    mockedServiceService.findServiceById.mockResolvedValue({ id: 's1' });
    const res = makeRes();
    await serviceController.findServiceById({ params: { id: 's1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('findServiceByName returns 200', async () => {
    mockedServiceService.findServiceByName.mockResolvedValue({ id: 's1' });
    const res = makeRes();
    await serviceController.findServiceByName({ params: { name: 'svc' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('findServiceByEndPoint returns 200', async () => {
    mockedServiceService.findServiceByEndPoint.mockResolvedValue({ id: 's1' });
    const res = makeRes();
    await serviceController.findServiceByEndPoint({ params: { endPoint: 'svc' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('findServiceInstanceEndPoint returns 200', async () => {
    mockedServiceService.findServiceInstanceEndPoint.mockResolvedValue([]);
    const res = makeRes();
    await serviceController.findServiceInstanceEndPoint({ params: { endPoint: 'svc' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('createService and bulk/create/delete', async () => {
    mockedServiceService.createService.mockResolvedValue({ id: 's1' });
    mockedServiceService.createBulkInstances.mockResolvedValue([]);
    mockedServiceService.deleteService.mockResolvedValue(true);
    const r1 = makeRes();
    await serviceController.createService({ body: { name: 'a', endPoint: 'e' } }, r1);
    const r2 = makeRes();
    await serviceController.createBulkInstances({ body: { instances: [] } }, r2);
    const r3 = makeRes();
    await serviceController.deleteService({ params: { name: 'a' } }, r3);
    expect(r1.status).toHaveBeenCalledWith(200);
    expect(r2.status).toHaveBeenCalledWith(200);
    expect(r3.status).toHaveBeenCalledWith(200);
  });

  test('getAllService and getServiceByName', async () => {
    mockedServiceService.getAllService = jest.fn().mockResolvedValue([]);
    mockedServiceService.getServiceByName = jest.fn().mockResolvedValue({ id: 's1' });
    const r1 = makeRes();
    await serviceController.getAllService({}, r1);
    const r2 = makeRes();
    await serviceController.getServiceByName({ params: { name: 'a' } }, r2);
    expect(r1.status).toHaveBeenCalledWith(200);
    expect(r2.status).toHaveBeenCalledWith(200);
  });

  test('getServiceById 404 when not found', async () => {
    mockedServiceService.findServiceById.mockResolvedValue(null);
    const res = makeRes();
    await serviceController.getServiceById({ params: { serviceId: 'x' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('updateService success', async () => {
    const res = makeRes();
    await serviceController.updateService({ params: { serviceId: 'x' }, body: { n: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getServiceInstances success', async () => {
    mockedServiceService.findInstancesByServiceId.mockResolvedValue([]);
    const res = makeRes();
    await serviceController.getServiceInstances({ params: { serviceId: 'x' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// (Keep single set above; remove duplicate block below)