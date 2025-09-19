const { TicketValidityService } = require('../../../../src/services/ticket/domain/TicketValidityService');

describe('TicketValidityService.calculateValidityPeriod', () => {
  test('day_pass adds 1 day', () => {
    const { validFrom, validUntil } = TicketValidityService.calculateValidityPeriod('day_pass');
    const diff = (validUntil - validFrom) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(1);
  });

  test('weekly_pass adds 7 days', () => {
    const { validFrom, validUntil } = TicketValidityService.calculateValidityPeriod('weekly_pass');
    const diff = (validUntil - validFrom) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(7);
  });

  test('monthly_pass adds 30 days', () => {
    const { validFrom, validUntil } = TicketValidityService.calculateValidityPeriod('monthly_pass');
    const diff = (validUntil - validFrom) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(30);
  });

  test('yearly_pass adds 365 days', () => {
    const { validFrom, validUntil } = TicketValidityService.calculateValidityPeriod('yearly_pass');
    const diff = (validUntil - validFrom) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(365);
  });

  test('lifetime_pass adds about 100 years', () => {
    const { validFrom, validUntil } = TicketValidityService.calculateValidityPeriod('lifetime_pass');
    const diff = (validUntil - validFrom) / (1000 * 60 * 60 * 24);
    expect(Math.floor(diff)).toBeGreaterThanOrEqual(36000);
  });

  test('unknown defaults to 30 days', () => {
    const { validFrom, validUntil } = TicketValidityService.calculateValidityPeriod('unknown');
    const diff = (validUntil - validFrom) / (1000 * 60 * 60 * 24);
    expect(Math.round(diff)).toBe(30);
  });
});


