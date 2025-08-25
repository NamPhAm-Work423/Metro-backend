const TransitPassService = require('../../../src/services/transitPass.service');

jest.mock('../../../src/grpc/publicClient', () => ({
  callTransitPass: jest.fn()
}));

const { callTransitPass } = require('../../../src/grpc/publicClient');

describe('TransitPassService', () => {
  let service;

  beforeEach(() => {
    service = new TransitPassService();
    jest.clearAllMocks();
  });

  describe('fetchAllTransitPasses', () => {
    it('returns passes with filters', async () => {
      const passes = [{ transitPassId: '1', transitPassType: 'DAILY' }];
      callTransitPass.mockResolvedValue({ transitPasses: passes });

      const result = await service.fetchAllTransitPasses({ transitPassType: 'DAILY', includeInactive: false });

      expect(callTransitPass).toHaveBeenCalledWith('ListTransitPasses', {
        transitPassType: 'DAILY',
        includeInactive: false
      });
      expect(result).toEqual(passes);
    });

    it('handles empty response', async () => {
      callTransitPass.mockResolvedValue({});
      const result = await service.fetchAllTransitPasses();
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      callTransitPass.mockRejectedValue(new Error('down'));
      await expect(service.fetchAllTransitPasses()).rejects.toThrow('Failed to fetch transit passes: down');
    });
  });

  describe('fetchTransitPassById', () => {
    it('returns pass by id', async () => {
      const pass = { transitPassId: '1', transitPassType: 'MONTHLY' };
      callTransitPass.mockResolvedValue(pass);
      const result = await service.fetchTransitPassById('1');
      expect(callTransitPass).toHaveBeenCalledWith('GetTransitPass', { transitPassId: '1' });
      expect(result).toEqual(pass);
    });

    it('throws on error', async () => {
      callTransitPass.mockRejectedValue(new Error('not found'));
      await expect(service.fetchTransitPassById('x')).rejects.toThrow('Failed to fetch transit pass x: not found');
    });
  });

  describe('fetchTransitPassByType', () => {
    it('filters by type and returns match or null', async () => {
      const passes = [
        { transitPassId: '1', transitPassType: 'DAILY' },
        { transitPassId: '2', transitPassType: 'MONTHLY' }
      ];
      callTransitPass.mockResolvedValue({ transitPasses: passes });

      const daily = await service.fetchTransitPassByType('DAILY');
      expect(daily).toEqual(passes[0]);

      const yearly = await service.fetchTransitPassByType('YEARLY');
      expect(yearly).toBeNull();
    });
  });
});


