const TransitPassRepository = require('../../../src/services/transitPass/repositories/TransitPassRepository');

jest.mock('../../../src/models/index.model', () => {
  const makePass = (overrides = {}) => ({
    transitPassId: overrides.transitPassId || 'tp-1',
    transitPassType: overrides.transitPassType || 'monthly_pass',
    currency: overrides.currency || 'VND',
    isActive: overrides.isActive ?? true,
    update: jest.fn(function (d) { return Object.assign(this, d); }),
    destroy: jest.fn(),
  });

  const db = { passes: [] };

  const TransitPass = {
    findAll: jest.fn(async ({ where = {}, order } = {}) => {
      let items = db.passes.filter(p => Object.keys(where).every(k => p[k] === where[k]));
      if (order) items = items.slice();
      return items;
    }),
    findByPk: jest.fn(async (id) => db.passes.find(p => p.transitPassId === id) || null),
    findOne: jest.fn(async ({ where }) => db.passes.find(p => Object.keys(where).every(k => p[k] === where[k])) || null),
    create: jest.fn(async (data) => { const p = makePass(data); db.passes.push(p); return p; }),
    update: jest.fn(async (data, { where }) => {
      const before = db.passes.filter(p => Object.keys(where).every(k => p[k] === where[k]));
      before.forEach(p => Object.assign(p, data));
      return [before.length];
    }),
  };

  return { TransitPass };
});

describe('TransitPassRepository', () => {
  beforeEach(() => {
    const { TransitPass } = require('../../../src/models/index.model');
    TransitPass.findAll.mockClear();
    TransitPass.findByPk.mockClear();
    TransitPass.findOne.mockClear();
    TransitPass.create.mockClear();
    TransitPass.update.mockClear();
  });

  test('create and find helpers', async () => {
    const repo = require('../../../src/services/transitPass/repositories/TransitPassRepository');
    await repo.create({ transitPassId: 'a', transitPassType: 'weekly_pass', currency: 'USD' });
    expect((await repo.findAll()).length).toBeGreaterThan(0);
    expect((await repo.findActive()).every(p => p.isActive)).toBe(true);
    expect((await repo.findById('a')).transitPassId).toBe('a');
    expect((await repo.findByType('weekly_pass')).transitPassType).toBe('weekly_pass');
    expect((await repo.findByCurrency('USD')).length).toBe(1);
  });

  test('update returns null when missing and updates fields when found', async () => {
    const repo = require('../../../src/services/transitPass/repositories/TransitPassRepository');
    const missing = await repo.update('nope', { isActive: false });
    expect(missing).toBeNull();
    const created = await repo.create({ transitPassId: 'b' });
    const updated = await repo.update('b', { isActive: false });
    expect(updated.isActive).toBe(false);
  });

  test('setActive toggles flag', async () => {
    const repo = require('../../../src/services/transitPass/repositories/TransitPassRepository');
    await repo.create({ transitPassId: 'c', isActive: false });
    const res = await repo.setActive('c', true);
    expect(res.isActive).toBe(true);
  });

  test('bulkUpdate applies filters and returns count', async () => {
    const repo = require('../../../src/services/transitPass/repositories/TransitPassRepository');
    await repo.create({ transitPassId: 'd', currency: 'VND', isActive: true });
    await repo.create({ transitPassId: 'e', currency: 'USD', isActive: true });
    const count = await repo.bulkUpdate({ currency: 'VND', isActive: true }, { isActive: false });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('delete returns null when not found and true when removed', async () => {
    const repo = require('../../../src/services/transitPass/repositories/TransitPassRepository');
    const missing = await repo.delete('zzz');
    expect(missing).toBeNull();
    await repo.create({ transitPassId: 'f' });
    const ok = await repo.delete('f');
    expect(ok).toBe(true);
  });
});


