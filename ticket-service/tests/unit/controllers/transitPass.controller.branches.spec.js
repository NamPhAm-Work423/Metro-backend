const controller = require('../../../src/controllers/transitPass.controller');

// Mock async error handler to bypass error handling wrapper
jest.mock('../../../src/helpers/errorHandler.helper', () => {
  return jest.fn().mockImplementation((fn) => fn);
});

jest.mock('../../../src/services/transitPass.service', () => ({
  getAllTransitPasses: jest.fn().mockRejectedValue(new Error('db')),
  getActiveTransitPasses: jest.fn().mockRejectedValue(new Error('db')),
  getTransitPassById: jest.fn().mockResolvedValue(null),
  getTransitPassByType: jest.fn().mockResolvedValue(null),
  getTransitPassesByCurrency: jest.fn().mockRejectedValue(new Error('db')),
  updateTransitPass: jest.fn().mockRejectedValue(new Error('db')),
  deleteTransitPass: jest.fn().mockRejectedValue(new Error('db')),
  setTransitPassActive: jest.fn().mockRejectedValue(new Error('db')),
  bulkUpdateTransitPasses: jest.fn().mockRejectedValue(new Error('db')),
  createTransitPass: jest.fn().mockRejectedValue(new Error('db')),
}));

// Mock tracing functions
jest.mock('../../../src/tracing', () => ({
    addCustomSpan: jest.fn((name, fn) => {
        if (typeof fn === 'function') {
            return fn({ 
                setAttributes: jest.fn(),
                recordException: jest.fn(),
                setStatus: jest.fn(),
                end: jest.fn()
            });
        }
        return Promise.resolve();
    })
}));

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('TransitPassController branches', () => {
  const next = jest.fn();
  test('createTransitPass returns 500 on service error', async () => {
    const req = { body: {} }; const res = mockRes();
    await controller.createTransitPass(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getAllTransitPasses returns 500 on service error', async () => {
    const req = {}; const res = mockRes();
    await controller.getAllTransitPasses(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getActiveTransitPasses returns 500 on service error', async () => {
    const req = {}; const res = mockRes();
    await controller.getActiveTransitPasses(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getTransitPassById returns 404 when not found', async () => {
    const req = { params: { id: 'uuid' } }; const res = mockRes();
    await controller.getTransitPassById(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getTransitPassByType returns 404 when not found', async () => {
    const req = { params: { transitPassType: 'monthly_pass' } }; const res = mockRes();
    await controller.getTransitPassByType(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getTransitPassesByCurrency returns 500 on service error', async () => {
    const req = { params: { currency: 'VND' } }; const res = mockRes();
    await controller.getTransitPassesByCurrency(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('updateTransitPass returns 500 on service error', async () => {
    const req = { params: { id: 'uuid' }, body: {} }; const res = mockRes();
    await controller.updateTransitPass(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('deleteTransitPass returns 500 on service error', async () => {
    const req = { params: { id: 'uuid' } }; const res = mockRes();
    await controller.deleteTransitPass(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('setTransitPassActive returns 500 on service error', async () => {
    const req = { params: { id: 'uuid' }, body: { isActive: true } }; const res = mockRes();
    await controller.setTransitPassActive(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('bulkUpdateTransitPasses returns 400 when missing body', async () => {
    const req = { body: {} }; const res = mockRes();
    await controller.bulkUpdateTransitPasses(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});


