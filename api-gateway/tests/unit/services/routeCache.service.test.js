jest.mock('../../../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

jest.mock('../../../src/config/redis', () => {
  const state = { typeMap: new Map(), hashes: new Map(), strings: new Map() };
  const client = {
    type: jest.fn(async (key) => state.typeMap.get(key) || 'none'),
    hGetAll: jest.fn(async (key) => {
      const m = state.hashes.get(key);
      return m ? Object.fromEntries(m.entries()) : {};
    }),
    get: jest.fn(async (key) => state.strings.get(key) || null),
    del: jest.fn(async (key) => { state.hashes.delete(key); state.strings.delete(key); state.typeMap.delete(key); }),
    hSet: jest.fn(async (key, obj) => {
      if (!state.hashes.has(key)) state.hashes.set(key, new Map());
      Object.entries(obj).forEach(([k, v]) => state.hashes.get(key).set(k, String(v)));
      state.typeMap.set(key, 'hash');
    }),
    expire: jest.fn(async () => {}),
    set: jest.fn(async (key, val, { EX }) => { state.strings.set(key, val); state.typeMap.set(key, 'string'); }),
    exists: jest.fn(async (key) => (state.hashes.has(key) || state.strings.has(key)) ? 1 : 0),
    hGet: jest.fn(async (key, field) => {
      const m = state.hashes.get(key);
      return m ? m.get(field) : null;
    }),
  };
  return {
    getClient: () => client,
    __reset: () => { state.typeMap.clear(); state.hashes.clear(); state.strings.clear(); },
  };
});

jest.mock('../../../src/config', () => () => ({
  services: [
    { name: 'Ticket', endPoint: 'tickets', status: 'active', instances: [{ host: 'h', port: 1 }] },
    { name: 'User', endPoint: 'users', status: 'inactive', instances: [] },
  ]
}));

const routeCache = require('../../../src/services/routeCache.service');

describe('routeCache.service', () => {
  beforeEach(() => {
    require('../../../src/config/redis').__reset();
    jest.clearAllMocks();
  });

  test('getRoute returns null when miss', async () => {
    const res = await routeCache.getRoute('tickets');
    expect(res).toBeNull();
  });

  test('refreshServiceCache loads route and instances to cache', async () => {
    const ok = await routeCache.refreshServiceCache('tickets');
    expect(ok).toBe(true);
    const client = require('../../../src/config/redis').getClient();
    const route = await client.hGetAll('api-gateway:route-cache:tickets');
    const instRaw = await client.get('api-gateway:service-instances:tickets');
    expect(route.serviceKey).toBe('tickets');
    expect(JSON.parse(instRaw).instances.length).toBe(1);
  });

  test('getServiceInstances returns [] when miss', async () => {
    const res = await routeCache.getServiceInstances('tickets');
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
  });

  test('getHealthyServiceInstances filters by loadbalancer status hash', async () => {
    await routeCache.refreshServiceCache('tickets');
    const client = require('../../../src/config/redis').getClient();
    await client.hSet('loadbalancer:instances:service:tickets:h:1', { status: 'true' });
    const healthy = await routeCache.getHealthyServiceInstances('tickets');
    expect(healthy.length).toBe(1);
  });

  test('preloadAllActiveServices preloads only active services', async () => {
    const res = await routeCache.preloadAllActiveServices();
    expect(res.success).toBe(true);
    expect(res.preloaded).toBe(1);
  });
});


