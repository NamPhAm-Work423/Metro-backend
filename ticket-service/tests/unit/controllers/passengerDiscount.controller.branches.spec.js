const controller = require('../../../src/controllers/passengerDiscount.controller');

jest.mock('../../../src/services/passengerDiscount', () => ({
  PassengerDiscountService: {
    getAllPassengerDiscounts: jest.fn().mockResolvedValue(['x']),
    getPassengerDiscountByType: jest.fn().mockResolvedValue(null),
    createPassengerDiscount: jest.fn().mockRejectedValue(new Error('boom')),
    updatePassengerDiscount: jest.fn().mockRejectedValue(new Error('boom')),
    deletePassengerDiscount: jest.fn().mockRejectedValue(new Error('boom')),
    calculateDiscount: jest.fn().mockResolvedValue({ finalPrice: 9000 }),
  }
}));

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('PassengerDiscountController branches', () => {
  test('getAllPassengerDiscounts returns 200', async () => {
    const req = {}; const res = mockRes();
    await controller.getAllPassengerDiscounts(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getPassengerDiscountByType returns 404 when missing', async () => {
    const req = { params: { passengerType: 'unknown' } }; const res = mockRes();
    await controller.getPassengerDiscountByType(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('createPassengerDiscount returns 500 on error', async () => {
    const req = { body: {} }; const res = mockRes();
    await controller.createPassengerDiscount(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('updatePassengerDiscount returns 500 on error', async () => {
    const req = { params: { discountId: 'id' }, body: {} }; const res = mockRes();
    await controller.updatePassengerDiscount(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('deletePassengerDiscount returns 500 on error', async () => {
    const req = { params: { discountId: 'id' } }; const res = mockRes();
    await controller.deletePassengerDiscount(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('calculateDiscount returns 400 when missing originalPrice', async () => {
    const req = { params: { passengerType: 'adult' }, query: {} }; const res = mockRes();
    await controller.calculateDiscount(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});


