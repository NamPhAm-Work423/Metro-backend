const PassengerDiscountService = require('../../../src/services/passengerDiscount.service');

jest.mock('../../../src/grpc/publicClient', () => ({
  callPassengerDiscount: jest.fn()
}));

const { callPassengerDiscount } = require('../../../src/grpc/publicClient');

describe('PassengerDiscountService', () => {
  let service;

  beforeEach(() => {
    service = new PassengerDiscountService();
    jest.clearAllMocks();
  });

  describe('fetchAllPassengerDiscounts', () => {
    it('returns discounts with filters', async () => {
      const discounts = [
        { discountId: 'd1', passengerType: 'STUDENT', percentage: 50 }
      ];
      callPassengerDiscount.mockResolvedValue({ discounts });

      const result = await service.fetchAllPassengerDiscounts({
        passengerType: 'STUDENT',
        includeInactive: false,
        onlyCurrentlyValid: true
      });

      expect(callPassengerDiscount).toHaveBeenCalledWith('ListPassengerDiscounts', {
        passengerType: 'STUDENT',
        includeInactive: false,
        onlyCurrentlyValid: true
      });
      expect(result).toEqual(discounts);
    });

    it('handles empty response', async () => {
      callPassengerDiscount.mockResolvedValue({});
      const result = await service.fetchAllPassengerDiscounts();
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      callPassengerDiscount.mockRejectedValue(new Error('down'));
      await expect(service.fetchAllPassengerDiscounts()).rejects.toThrow('Failed to fetch passenger discounts: down');
    });
  });

  describe('fetchPassengerDiscountById', () => {
    it('returns discount by id', async () => {
      const discount = { discountId: 'd1', passengerType: 'SENIOR', percentage: 30 };
      callPassengerDiscount.mockResolvedValue(discount);
      const result = await service.fetchPassengerDiscountById('d1');
      expect(callPassengerDiscount).toHaveBeenCalledWith('GetPassengerDiscount', { discountId: 'd1' });
      expect(result).toEqual(discount);
    });

    it('throws on error', async () => {
      callPassengerDiscount.mockRejectedValue(new Error('not found'));
      await expect(service.fetchPassengerDiscountById('x')).rejects.toThrow('Failed to fetch passenger discount x: not found');
    });
  });

  describe('fetchPassengerDiscountByType', () => {
    it('filters by type and returns match or null', async () => {
      const discounts = [
        { discountId: 'd1', passengerType: 'STUDENT', percentage: 50 },
        { discountId: 'd2', passengerType: 'SENIOR', percentage: 30 }
      ];
      callPassengerDiscount.mockResolvedValue({ discounts });

      const student = await service.fetchPassengerDiscountByType('STUDENT');
      expect(student).toEqual(discounts[0]);

      const child = await service.fetchPassengerDiscountByType('CHILD');
      expect(child).toBeNull();
    });

    it('propagates errors from underlying call', async () => {
      callPassengerDiscount.mockRejectedValue(new Error('grpc error'));
      await expect(service.fetchPassengerDiscountByType('SENIOR')).rejects.toThrow('grpc error');
    });
  });
});


