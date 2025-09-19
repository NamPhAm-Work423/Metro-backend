const TicketService = require('../../../../src/services/ticket/services/TicketService');

jest.mock('../../../../src/models/index.model', () => ({
	Ticket: {
		findByPk: jest.fn(),
	},
}));

const { Ticket } = require('../../../../src/models/index.model');

describe('TicketService.cancelTicket', () => {
	const service = require('../../../../src/services/ticket/services/TicketService');

	const makeTicket = (overrides = {}) => ({
		ticketId: 't1',
		passengerId: 'p1',
		status: 'active',
		update: jest.fn().mockResolvedValue({ status: 'cancelled', isActive: false }),
		...overrides,
	});

	test('returns undefined when ticket not found (logged)', async () => {
		Ticket.findByPk.mockResolvedValue(null);
		await expect(service.cancelTicket('missing')).resolves.toBeUndefined();
	});

	test('returns undefined when unauthorized passenger (logged)', async () => {
		Ticket.findByPk.mockResolvedValue(makeTicket());
		await expect(service.cancelTicket('t1', 'because', 'other')).resolves.toBeUndefined();
	});

	test('returns undefined when ticket already used (logged)', async () => {
		Ticket.findByPk.mockResolvedValue(makeTicket({ status: 'used' }));
		await expect(service.cancelTicket('t1')).resolves.toBeUndefined();
	});

	test('returns undefined when ticket already cancelled (logged)', async () => {
		Ticket.findByPk.mockResolvedValue(makeTicket({ status: 'cancelled' }));
		await expect(service.cancelTicket('t1')).resolves.toBeUndefined();
	});

	test('updates ticket and logs info when valid', async () => {
		const t = makeTicket();
		Ticket.findByPk.mockResolvedValue(t);
		const result = await service.cancelTicket('t1', 'Passenger request', 'p1');
		expect(t.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled', isActive: false }));
		expect(result.status).toBe('cancelled');
	});
});
