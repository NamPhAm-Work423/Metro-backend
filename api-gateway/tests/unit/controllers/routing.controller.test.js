jest.mock('../../../src/helpers/errorHandler.helper', () => (fn) => (req, res, next) => fn(req, res, next));
jest.mock('../../../src/services/routing.service', () => ({
  routeRequest: jest.fn(),
  checkServiceHealth: jest.fn()
}));
jest.mock('../../../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const routingController = require('../../../src/controllers/routing.controller');
const mockedRoutingService = require('../../../src/services/routing.service');

function makeReqRes(params = {}) {
  const req = { params, method: 'GET', originalUrl: '/r/passengers%2Fme/extra', get: () => 'ua', ip: '127.0.0.1' };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), headersSent: false, statusCode: 200 };
  const next = jest.fn();
  return { req, res, next };
}

describe('routing.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('useService decodes and routes', async () => {
    mockedRoutingService.routeRequest.mockResolvedValue();
    const { req, res, next } = makeReqRes({ endPoint: 'passengers%2Fme', 0: 'path' });
    await routingController.useService(req, res, next);
    expect(mockedRoutingService.routeRequest).toHaveBeenCalled();
  });

  test('useService handles error with CustomError', async () => {
    const { req, res, next } = makeReqRes({ endPoint: 'x', 0: '' });
    const CustomError = require('../../../src/utils/customError');
    mockedRoutingService.routeRequest.mockRejectedValue(new CustomError('nope', 403));
    await routingController.useService(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'ROUTING_ERROR' }));
  });

  test('useService preserves proxy status code when already set', async () => {
    const { req, res, next } = makeReqRes({ endPoint: 'x', 0: '' });
    res.statusCode = 502;
    mockedRoutingService.routeRequest.mockRejectedValue(new Error('proxy failed'));
    await routingController.useService(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('checkServiceHealth returns 200/503', async () => {
    const { req, res, next } = makeReqRes({ endPoint: 'service' });
    mockedRoutingService.checkServiceHealth.mockResolvedValueOnce({ healthy: true }).mockResolvedValueOnce({ healthy: false });
    await routingController.checkServiceHealth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    await routingController.checkServiceHealth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
  });
});

// (Removed duplicated test suite block below)