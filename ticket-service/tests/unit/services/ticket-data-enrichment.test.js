jest.mock('../../../src/grpc/transportClient', () => ({
  getStation: jest.fn()
}));
jest.mock('../../../src/config/redis', () => ({
  getClient: jest.fn()
}));

const TransportClient = require('../../../src/grpc/transportClient');
const { getClient } = require('../../../src/config/redis');
const Svc = require('../../../src/services/ticket/helpers/TicketDataEnrichmentService');

describe('TicketDataEnrichmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('_getFallbackStationName normalizes ids', () => {
    expect(Svc._getFallbackStationName('ben-thanh')).toBe('Bến Thành');
    expect(Svc._getFallbackStationName('BEN_THANH')).toBe('Bến Thành');
    expect(Svc._getFallbackStationName('suoi-tien')).toBe('Suối Tiên');
  });

  test('isSingleUseTicket / isMultiUseTicket', () => {
    expect(Svc.isSingleUseTicket('oneway')).toBe(true);
    expect(Svc.isSingleUseTicket('monthly_pass')).toBe(false);
    expect(Svc.isMultiUseTicket('monthly_pass')).toBe(true);
    expect(Svc.isMultiUseTicket('oneway')).toBe(false);
  });

  test('getEmailTemplateName', () => {
    expect(Svc.getEmailTemplateName('oneway')).toBe('singleUseTicketEmail');
    expect(Svc.getEmailTemplateName('monthly_pass')).toBe('multiUseTicketEmail');
  });

  test('getTicketTypeName with passenger count', () => {
    expect(Svc.getTicketTypeName('oneway', 1)).toMatch(/Vé một chiều/);
    expect(Svc.getTicketTypeName('oneway', 3)).toMatch(/3 hành khách/);
  });

  test('formatCurrency formats VND', () => {
    const s = Svc.formatCurrency(123456);
    expect(typeof s).toBe('string');
    expect(s).toMatch(/₫/);
  });

  test('formatDate/formatTime handle null', () => {
    expect(typeof Svc.formatDate()).toBe('string');
    expect(typeof Svc.formatTime()).toBe('string');
  });

  test('getStationName from cache then grpc then fallback', async () => {
    const redis = { get: jest.fn(), setEx: jest.fn() };
    getClient.mockReturnValue(redis);
    redis.get.mockResolvedValue('Cached Name');
    expect(await Svc.getStationName('S1')).toBe('Cached Name');

    // miss cache -> grpc success
    redis.get.mockResolvedValue(null);
    TransportClient.getStation.mockResolvedValue({ name: 'Remote Name' });
    const name = await Svc.getStationName('S2');
    expect(name).toBe('Remote Name');
    expect(redis.setEx).toHaveBeenCalled();

    // grpc error -> fallback
    TransportClient.getStation.mockRejectedValue(new Error('down'));
    const fb = await Svc.getStationName('unknown-station');
    expect(fb).toMatch(/unknown-station/);
  });

  test('getStationNamesBatch mixes fulfill/reject', async () => {
    const redis = { get: jest.fn(), setEx: jest.fn() };
    getClient.mockReturnValue(redis);
    redis.get.mockResolvedValue(null);
    TransportClient.getStation
      .mockResolvedValueOnce({ name: 'A' })
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce({ name: 'C' });
    const res = await Svc.getStationNamesBatch(['a', 'b', 'c']);
    expect(res.get('a')).toBe('A');
    expect(res.get('b')).toMatch(/b/);
    expect(res.get('c')).toBe('C');
  });

  test('extractDepartureInfoFromQR valid and invalid', () => {
    const valid = Buffer.from(JSON.stringify({ validFrom: '2025-01-02T03:04:05Z' }), 'utf8').toString('base64');
    const info = Svc.extractDepartureInfoFromQR(valid);
    expect(info.date).toBeTruthy();
    expect(info.time).toBeTruthy();
    const bad = 'not-base64';
    const info2 = Svc.extractDepartureInfoFromQR(bad);
    expect(info2).toEqual({ date: null, time: null });
  });

  test('getStatusText and getTotalPassengersText', () => {
    expect(Svc.getStatusText('active')).toMatch(/hiệu lực/i);
    expect(Svc.getStatusText('unknown')).toBe('unknown');
    expect(Svc.getTotalPassengersText(1)).toMatch(/^1 /);
    expect(Svc.getTotalPassengersText(3)).toMatch(/^3 /);
  });

  test('calculateUsageStats with usedList and without', () => {
    const now = new Date();
    const t = { validUntil: new Date(now.getTime() + 86400000), usedList: [new Date().toISOString()] };
    const stats = Svc.calculateUsageStats(t);
    expect(stats.totalTrips).toBe(1);
    expect(typeof stats.daysRemaining).toBe('number');
    expect(typeof stats.lastUsed).toBe('string');

    const stats2 = Svc.calculateUsageStats({ usedList: [] });
    expect(stats2.totalTrips).toBe(0);
    expect(stats2.lastUsed).toMatch(/Chưa/);
  });

  test('formatValidity helpers', () => {
    expect(Svc.formatValidityDate(null)).toMatch(/Không xác định/);
    expect(Svc.formatValidityTime(null)).toMatch(/Không xác định/);
    const s = Svc.formatValidityDateTime(new Date());
    expect(s).toMatch(/lúc/);
  });

  test('enrichTicketForEvent success (multi-use)', async () => {
    const redis = { get: jest.fn(), setEx: jest.fn() };
    getClient.mockReturnValue(redis);
    redis.get.mockResolvedValue(null);
    TransportClient.getStation.mockResolvedValue({ name: 'Origin' });
    const ticket = {
      ticketId: 't1', passengerId: 'u1', qrCode: Buffer.from(JSON.stringify({ validFrom: new Date().toISOString() })).toString('base64'),
      totalPrice: 12345, totalPassengers: 2,
      originStationId: 'o', destinationStationId: 'd', ticketType: 'monthly_pass', status: 'active',
      activatedAt: new Date().toISOString(), validFrom: new Date().toISOString(), validUntil: new Date(Date.now()+86400000).toISOString(), usedList: []
    };
    const out = await Svc.enrichTicketForEvent(ticket);
    expect(out.templateName).toBe('multiUseTicketEmail');
    expect(out.displayData.fromStationName).toBeTruthy();
    expect(out.displayData.validUntilDateTime).toBeTruthy();
  });

  test('enrichTicketForEvent error path returns minimal data', async () => {
    // Force an error by mocking getStationNamesBatch to throw
    const spy = jest.spyOn(Svc, 'getStationNamesBatch').mockRejectedValue(new Error('boom'));
    const ticket = {
      ticketId: 't1', passengerId: 'u1', qrCode: null,
      totalPrice: 0, totalPassengers: 1,
      originStationId: 'o', destinationStationId: 'd', ticketType: 'oneway', status: 'active'
    };
    const out = await Svc.enrichTicketForEvent(ticket);
    expect(out.displayData).toBeDefined();
    expect(out.isMultiUse).toBe(false);
    spy.mockRestore();
  });
});


