const PromotionRepository = require('../../../src/services/promotion/repositories/PromotionRepository');

jest.mock('../../../src/models/index.model', () => {
  const now = new Date();
  const inFuture = new Date(now.getTime() + 24 * 3600 * 1000);
  const inPast = new Date(now.getTime() - 24 * 3600 * 1000);

  const makePromo = (overrides = {}) => ({
    promotionId: overrides.promotionId || 'uuid-1',
    promotionCode: overrides.promotionCode || 'PROMO1',
    name: 'Name',
    type: overrides.type || 'percentage',
    value: overrides.value || 10,
    isActive: overrides.isActive ?? true,
    validFrom: overrides.validFrom || inPast,
    validUntil: overrides.validUntil || inFuture,
    applicableTicketTypes: overrides.applicableTicketTypes || null,
    applicablePassengerTypes: overrides.applicablePassengerTypes || null,
    usageLimit: overrides.usageLimit,
    usageCount: overrides.usageCount || 0,
    currency: 'VND',
    update: jest.fn(function (data) { return { ...this, ...data }; }),
    destroy: jest.fn(),
  });

  const db = {
    promos: [],
  };

  const Promotion = {
    create: jest.fn(async (data) => {
      const p = makePromo(data);
      db.promos.push(p);
      return p;
    }),
    findAll: jest.fn(async (opts = {}) => {
      let items = [...db.promos];
      if (opts.where) {
        const w = opts.where;
        items = items.filter(p => {
          let ok = true;
          if (w.isActive !== undefined) ok = ok && p.isActive === w.isActive;
          if (w.type) ok = ok && p.type === w.type;
          if (w.validFrom && w.validFrom['$lte']) ok = ok && p.validFrom <= w.validFrom['$lte'];
          if (w.validUntil && w.validUntil['$gte']) ok = ok && p.validUntil >= w.validUntil['$gte'];
          if (w.applicableTicketTypes && w.applicableTicketTypes['$contains']) {
            const val = w.applicableTicketTypes['$contains'][0];
            ok = ok && Array.isArray(p.applicableTicketTypes) && p.applicableTicketTypes.includes(val);
          }
          if (w['$or']) {
            const [cond1, cond2] = w['$or'];
            const hasRoute = cond1.applicableRoutes && cond1.applicableRoutes['$contains'];
            const isNull = cond2.applicableRoutes && cond2.applicableRoutes['$eq'] === null;
            const condMatch = (hasRoute ? (Array.isArray(p.applicableRoutes) && p.applicableRoutes.includes(cond1.applicableRoutes['$contains'][0])) : false) || (isNull ? p.applicableRoutes == null : false);
            ok = ok && condMatch;
          }
          return ok;
        });
      }
      return items;
    }),
    findByPk: jest.fn(async (id) => db.promos.find(p => p.promotionId === id) || null),
    findOne: jest.fn(async (opts = {}) => {
      if (!opts.where) return db.promos[0] || null;
      const keys = Object.keys(opts.where);
      return db.promos.find(p => keys.every(k => p[k] === opts.where[k])) || null;
    }),
    update: jest.fn(async (data, { where }) => {
      const before = db.promos.filter(p => Object.keys(where).every(k => p[k] === where[k]));
      before.forEach(p => Object.assign(p, data));
      return [before.length, before];
    }),
    sequelize: { fn: jest.fn(), col: jest.fn() },
  };

  const Ticket = {
    count: jest.fn(async ({ where }) => {
      // Simulate active ticket usage when promotionId === 'busy'
      return where.promotionId === 'busy' ? 2 : 0;
    }),
  };

  return { Promotion, Ticket };
});

jest.mock('../../../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

describe('PromotionRepository', () => {
  beforeEach(() => {
    const { Promotion } = require('../../../src/models/index.model');
    Promotion.create.mockClear();
    Promotion.findAll.mockClear();
    Promotion.findByPk.mockClear();
    Promotion.findOne.mockClear();
    Promotion.update.mockClear();
  });

  test('create returns success envelope', async () => {
    const res = await new PromotionRepository().create({ promotionCode: 'C1' });
    expect(res.success).toBe(true);
    expect(res.data.promotionCode).toBe('C1');
  });

  test('findAll supports filters and includes', async () => {
    const { Promotion } = require('../../../src/models/index.model');
    await Promotion.create({ promotionId: 'a', promotionCode: 'A', type: 'percentage' });
    await Promotion.create({ promotionId: 'b', promotionCode: 'B', type: 'fixed' });
    const list = await new PromotionRepository().findAll({ type: 'percentage', isActive: true });
    const ids = list.map(p => p.promotionId);
    expect(ids).toEqual(expect.arrayContaining(['a']));
  });

  test('findById throws when not found', async () => {
    await expect(new PromotionRepository().findById('missing')).rejects.toThrow('Promotion not found');
  });

  test('findByCode throws when not found', async () => {
    await expect(new PromotionRepository().findByCode('NOPE')).rejects.toThrow('Promotion not found');
  });

  test('update falls back to find by code when UUID invalid or not found by id', async () => {
    const { Promotion } = require('../../../src/models/index.model');
    await Promotion.create({ promotionId: 'uuid-2', promotionCode: 'CODE2' });
    // Simulate invalid UUID path by throwing in findByPk then find by code
    Promotion.findByPk.mockImplementationOnce(() => { const e = new Error('invalid input syntax for type uuid'); throw e; });
    const updated = await new PromotionRepository().update('CODE2', { name: 'New' });
    expect(updated.name).toBe('New');
  });

  test('delete refuses when in active tickets', async () => {
    const { Promotion } = require('../../../src/models/index.model');
    await Promotion.create({ promotionId: 'busy', promotionCode: 'BUSY' });
    await expect(new PromotionRepository().delete('busy')).rejects.toThrow('Cannot delete promotion that is used in active tickets');
  });

  test('delete removes when no active tickets', async () => {
    const { Promotion } = require('../../../src/models/index.model');
    await Promotion.create({ promotionId: 'free', promotionCode: 'FREE' });
    const repo = new PromotionRepository();
    const res = await repo.delete('free');
    expect(res).toEqual({ message: 'Promotion deleted successfully' });
  });

  test('findActive filters by validity and usage limit', async () => {
    const now = new Date();
    const { Promotion } = require('../../../src/models/index.model');
    await Promotion.create({ promotionId: 'p1', promotionCode: 'P1', usageLimit: 10, usageCount: 1, validFrom: new Date(now.getTime() - 1000), validUntil: new Date(now.getTime() + 1000) });
    await Promotion.create({ promotionId: 'p2', promotionCode: 'P2', usageLimit: 1, usageCount: 2, validFrom: new Date(now.getTime() - 1000), validUntil: new Date(now.getTime() + 1000) });
    const list = await new PromotionRepository().findActive();
    expect(list.find(p => p.promotionId === 'p1')).toBeTruthy();
    expect(list.find(p => p.promotionId === 'p2')).toBeFalsy();
  });

  test('findPassPromotions maps fields', async () => {
    const { Promotion } = require('../../../src/models/index.model');
    await Promotion.create({ promotionId: 'p3', promotionCode: 'PX', applicableTicketTypes: ['monthly_pass'] });
    const res = await new PromotionRepository().findPassPromotions('monthly_pass');
    const codes = res.map(r => r.promotionCode);
    expect(codes).toEqual(expect.arrayContaining(['PX']));
  });

  test('findRoutePromotions supports route filter or null', async () => {
    const { Promotion } = require('../../../src/models/index.model');
    await Promotion.create({ promotionId: 'p4', promotionCode: 'PR', applicableRoutes: ['r1'] });
    await Promotion.create({ promotionId: 'p5', promotionCode: 'PN', applicableRoutes: null });
    const res = await new PromotionRepository().findRoutePromotions('r1');
    const codes = res.map(x => x.promotionCode);
    expect(codes).toEqual(expect.arrayContaining(['PR', 'PN']));
  });
});


