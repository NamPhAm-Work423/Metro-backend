const TicketService = require('../../../../src/services/ticket/services/TicketService');

jest.mock('../../../../src/models/index.model', () => ({
	Ticket: {
		findAll: jest.fn(),
		update: jest.fn(),
		findByPk: jest.fn(),
		create: jest.fn().mockResolvedValue({ ticketId: 't1', passengerId: 'p1', ticketType: 'oneway', reload: jest.fn(), update: jest.fn() }),
	},
	Promotion: { findByPk: jest.fn().mockResolvedValue({ incrementUsage: jest.fn() }) },
	Fare: { findOne: jest.fn().mockResolvedValue({ fareId: 'f1', isActive: true }) },
	TransitPass: { findOne: jest.fn().mockResolvedValue({ price: '100000', currency: 'VND' }), transitPassType: ['monthly_pass'] },
	PassengerDiscount: {},
}));

jest.mock('../../../../src/services/ticket/calculators/TicketPriceCalculator', () => ({
	calculateTotalPriceForPassengers: jest.fn().mockResolvedValue({
		data: {
			totalPrice: 50000,
			totalOriginalPrice: 60000,
			totalDiscountAmount: 10000,
			appliedPromotion: { promotionId: 'pr1', promotionCode: 'CODE', applicableTicketTypes: ['Oneway'], calculateDiscount: (x) => 1000 },
			journeyDetails: { totalStations: 3, routeSegments: [{ originStationId: 'A', destinationStationId: 'B', routeId: 'r1' }], totalPassengers: 2 },
			segmentFares: [{ routeId: 'r1' }],
			passengerBreakdown: [{ type: 'adult', count: 2 }],
		}
	})
}));

jest.mock('../../../../src/services/ticket/services/TicketPaymentService', () => ({
	processTicketPayment: jest.fn().mockResolvedValue({ paymentId: 'pay_1' }),
	waitForPaymentResponse: jest.fn().mockResolvedValue(null),
}));

const { Ticket } = require('../../../../src/models/index.model');
const priceCalc = require('../../../../src/services/ticket/calculators/TicketPriceCalculator');

describe('TicketService targeted branches', () => {
	const service = require('../../../../src/services/ticket/services/TicketService');

	test('_createShortTermTicketInternal applies promotion and handles QR failure gracefully', async () => {
		process.env.TICKET_QR_SECRET = 'secret';
		// Force QR generate to throw by removing secret mid-call
		const spy = jest.spyOn(service, '_generateQRCode').mockImplementation(() => { throw new Error('qr fail'); });
		const updateSpy = jest.spyOn(service.repository, 'update').mockResolvedValue({});
		const res = await service._createShortTermTicketInternal({ passengerId: 'p1', fromStation: 'A', toStation: 'B', tripType: 'Oneway', paymentMethod: 'card', promotionCode: 'CODE', numAdults: 1 });
		expect(priceCalc.calculateTotalPriceForPassengers).toHaveBeenCalled();
		expect(updateSpy).not.toHaveBeenCalled();
		expect(res.ticket).toBeDefined();
		spy.mockRestore();
	});

	test('expireTickets batches through results until empty', async () => {
		Ticket.findAll
			.mockResolvedValueOnce([{ ticketId: 't1' }, { ticketId: 't2' }])
			.mockResolvedValueOnce([]);
		Ticket.update.mockResolvedValue([2]);
		const count = await service.expireTickets();
		expect(count).toBe(2);
		expect(Ticket.update).toHaveBeenCalled();
	});
});
