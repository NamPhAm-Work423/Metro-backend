const PromotionRepository = require('../../../../src/services/promotion/repositories/PromotionRepository');

jest.mock('../../../../src/models/index.model', () => ({
	Promotion: {
		create: jest.fn(),
		findAll: jest.fn(),
		findByPk: jest.fn(),
		findOne: jest.fn(),
		update: jest.fn(),
		sequelize: { fn: jest.fn(), col: jest.fn() },
	},
	Ticket: { count: jest.fn() },
}));

describe('PromotionRepository difficult branches', () => {
	const repo = new PromotionRepository();
    const { Promotion, Ticket } = require('../../../../src/models/index.model');

	beforeEach(() => jest.clearAllMocks());

	test('findById throws when not found', async () => {
		Promotion.findByPk.mockResolvedValueOnce(null);
		await expect(repo.findById('P1')).rejects.toThrow('Promotion not found');
	});

	test('findByCode throws when not found', async () => {
		Promotion.findOne.mockResolvedValueOnce(null);
		await expect(repo.findByCode('X')).rejects.toThrow('Promotion not found');
	});

	test('update falls back to code when UUID invalid', async () => {
		Promotion.findByPk.mockRejectedValueOnce(new Error('invalid input syntax for type uuid'));
		Promotion.findOne.mockResolvedValueOnce({ update: jest.fn().mockResolvedValue({ promotionId: 'P1' }), promotionId: 'P1', promotionCode: 'C1' });
		const out = await repo.update('NOT-A-UUID', { name: 'n' });
		expect(out).toEqual({ promotionId: 'P1' });
	});

	test('update throws when missing by id and code', async () => {
		Promotion.findByPk.mockResolvedValueOnce(null);
		Promotion.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
		await expect(repo.update('P1', { name: 'n' })).rejects.toThrow('Promotion not found');
	});

	test('delete refuses when in active tickets', async () => {
		Promotion.findByPk.mockResolvedValueOnce({});
		Ticket.count.mockResolvedValueOnce(1);
		await expect(repo.delete('P1')).rejects.toThrow('Cannot delete promotion');
	});

	test('findActive filters by time and usageLimit', async () => {
		Promotion.findAll.mockResolvedValueOnce([
			{ usageLimit: 10, usageCount: 5 },
			{ usageLimit: 10, usageCount: 10 },
		]);
		const res = await repo.findActive({ ticketType: 'day_pass', passengerType: 'adult' });
		expect(Array.isArray(res)).toBe(true);
		expect(res.length).toBe(1);
	});

	test('getStatistics groups and aggregates', async () => {
		Promotion.findAll.mockResolvedValueOnce([]);
		await repo.getStatistics({ type: 'percentage', dateFrom: new Date(0), dateTo: new Date(1) });
		expect(Promotion.findAll).toHaveBeenCalledWith(expect.objectContaining({ attributes: expect.any(Array), group: ['type'], raw: true }));
	});
});


