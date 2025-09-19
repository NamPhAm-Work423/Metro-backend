const TransitPassValidator = require('../../../../src/services/transitPass/services/TransitPassValidator');

describe('TransitPassValidator', () => {
  test('validateCreate passes with minimal valid data', () => {
    expect(() => TransitPassValidator.validateCreate({ transitPassType: 'monthly_pass', price: 0, currency: 'VND' })).not.toThrow();
  });

  test('validateCreate throws for missing fields and invalid values', () => {
    expect(() => TransitPassValidator.validateCreate({})).toThrow(/transitPassType is required/);
    expect(() => TransitPassValidator.validateCreate({ transitPassType: 'monthly_pass' })).toThrow(/price is required/);
    expect(() => TransitPassValidator.validateCreate({ transitPassType: 'monthly_pass', price: -1 })).toThrow(/price must be/);
    expect(() => TransitPassValidator.validateCreate({ transitPassType: 'monthly_pass', price: 10, currency: 'XYZ' })).toThrow(/invalid currency/);
  });

  test('validateUpdate allows partials but enforces constraints', () => {
    expect(() => TransitPassValidator.validateUpdate({})).not.toThrow();
    expect(() => TransitPassValidator.validateUpdate({ price: -5 })).toThrow(/price must be/);
    expect(() => TransitPassValidator.validateUpdate({ currency: 'EUR' })).toThrow(/invalid currency/);
  });
});


