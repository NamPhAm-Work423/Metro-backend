const controller = require('../../../src/controllers/transitPass.controller');

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

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('TransitPassController branches', () => {
  test('createTransitPass returns 500 on service error', async () => {
    const req = { body: {} }; const res = mockRes();
    await controller.createTransitPass(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getAllTransitPasses returns 500 on service error', async () => {
    const req = {}; const res = mockRes();
    await controller.getAllTransitPasses(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getActiveTransitPasses returns 500 on service error', async () => {
    const req = {}; const res = mockRes();
    await controller.getActiveTransitPasses(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getTransitPassById returns 404 when not found', async () => {
    const req = { params: { id: 'uuid' } }; const res = mockRes();
    await controller.getTransitPassById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getTransitPassByType returns 404 when not found', async () => {
    const req = { params: { transitPassType: 'monthly_pass' } }; const res = mockRes();
    await controller.getTransitPassByType(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getTransitPassesByCurrency returns 500 on service error', async () => {
    const req = { params: { currency: 'VND' } }; const res = mockRes();
    await controller.getTransitPassesByCurrency(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('updateTransitPass returns 500 on service error', async () => {
    const req = { params: { id: 'uuid' }, body: {} }; const res = mockRes();
    await controller.updateTransitPass(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('deleteTransitPass returns 500 on service error', async () => {
    const req = { params: { id: 'uuid' } }; const res = mockRes();
    await controller.deleteTransitPass(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('setTransitPassActive returns 500 on service error', async () => {
    const req = { params: { id: 'uuid' }, body: { isActive: true } }; const res = mockRes();
    await controller.setTransitPassActive(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('bulkUpdateTransitPasses returns 400 when missing body', async () => {
    const req = { body: {} }; const res = mockRes();
    await controller.bulkUpdateTransitPasses(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});


