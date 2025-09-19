jest.mock('../../../../src/models/index.model', () => ({
  Ticket: {
    create: jest.fn().mockResolvedValue({
      ticketId: 't1',
      passengerId: 'p1',
      ticketType: 'oneway',
      reload: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(true),
    }),
    findByPk: jest.fn(),
    startCountDown: jest.fn(),
  },
  Fare: { findOne: jest.fn().mockResolvedValue({ fareId: 'f1', isActive: true }) },
  Promotion: { findByPk: jest.fn(), findOne: jest.fn() },
  TransitPass: { findOne: jest.fn().mockResolvedValue({ price: '100000', currency: 'VND' }), transitPassType: ['day_pass','weekly_pass','monthly_pass','yearly_pass','lifetime_pass'] },
  PassengerDiscount: { findOne: jest.fn().mockResolvedValue(null) },
}));

jest.mock('../../../../src/services/ticket/services/TicketPaymentService', () => ({
  processTicketPayment: jest.fn().mockResolvedValue({ paymentId: 'pay_1' }),
  waitForPaymentResponse: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../../src/services/ticket/calculators/TicketPriceCalculator', () => ({
  calculateTotalPriceForPassengers: jest.fn().mockResolvedValue({
    data: {
      totalPrice: 50000,
      totalOriginalPrice: 60000,
      totalDiscountAmount: 10000,
      appliedPromotion: null,
      journeyDetails: { totalStations: 3, routeSegments: [{ originStationId: 'A', destinationStationId: 'B', routeId: 'r1' }], totalPassengers: 2 },
      segmentFares: [{ routeId: 'r1' }],
      passengerBreakdown: [{ type: 'adult', count: 2 }],
    }
  })
}));

const { Ticket, Fare, Promotion, TransitPass } = require('../../../../src/models/index.model');
const TicketService = require('../../../../src/services/ticket/services/TicketService');

describe('TicketService internals', () => {
  const service = require('../../../../src/services/ticket/services/TicketService');

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.TICKET_QR_SECRET = 'secret';
  });

  test('_createShortTermTicketInternal creates ticket and generates QR', async () => {
    const ticketData = { passengerId: 'p1', fromStation: 'A', toStation: 'B', tripType: 'Oneway', paymentMethod: 'card', numAdults: 1 };
    const res = await service._createShortTermTicketInternal(ticketData);
    expect(res.ticket).toBeDefined();
    expect(res.paymentId).toBeDefined();
  });

  test('_createShortTermTicketInternal zero-price path falls back QR and marks free', async () => {
    const calc = require('../../../../src/services/ticket/calculators/TicketPriceCalculator');
    calc.calculateTotalPriceForPassengers.mockResolvedValueOnce({
      data: {
        totalPrice: 0,
        totalOriginalPrice: 0,
        totalDiscountAmount: 0,
        appliedPromotion: null,
        journeyDetails: { totalStations: 0, routeSegments: [{ originStationId: 'A', destinationStationId: 'B', routeId: 'r1' }], totalPassengers: 1 },
        segmentFares: [{ routeId: 'r1' }],
        passengerBreakdown: [{ type: 'adult', count: 1 }],
      }
    });
    const updateSpy = jest.spyOn(service.repository, 'update').mockResolvedValue({});
    const ticketData = { passengerId: 'p1', fromStation: 'A', toStation: 'B', tripType: 'Oneway', numAdults: 1 };
    const res = await service._createShortTermTicketInternal(ticketData);
    expect(updateSpy).toHaveBeenCalled();
    expect(res.paymentId).toBeNull();
  });

  test('_createLongTermTicketInternal creates pass ticket and processes payment', async () => {
    const ticketData = { passengerId: 'p1', passType: 'monthly_pass', paymentMethod: 'card' };
    const res = await service._createLongTermTicketInternal(ticketData);
    expect(res.ticket).toBeDefined();
    expect(res.paymentId).toBe('pay_1');
  });
});


