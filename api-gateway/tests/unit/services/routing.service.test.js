jest.mock('../../../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

jest.mock('../../../src/services/routeCache.service', () => ({
  getRoute: jest.fn(),
  getHealthyServiceInstances: jest.fn(),
  invalidateRoute: jest.fn(),
  invalidateAllRoutes: jest.fn(),
  getCacheStats: jest.fn(),
}));

// proxy mock with controllable behavior and captured options
const mockProxyImpl = jest.fn();
jest.mock('express-http-proxy', () => {
  const store = { path: null, options: null };
  const fn = jest.fn((path, options) => {
    store.path = path;
    store.options = options;
    return (req, res, next) => mockProxyImpl(req, res, next);
  });
  fn.__getOptions = () => store.options;
  fn.__getPath = () => store.path;
  return fn;
});

const jwt = require('jsonwebtoken');
const routeCache = require('../../../src/services/routeCache.service');
const routing = require('../../../src/services/routing.service');

describe('routing.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SERVICE_JWT_SECRET = 'svc_secret';
    mockProxyImpl.mockImplementation((req, res, next) => {
      res.statusCode = 200;
      res.emit('finish');
      next && next();
    });
  });

  test('generateServiceToken requires secret and signs payload', () => {
    const token = routing.generateServiceToken({ id: 'u', email: 'e', roles: ['r'] });
    const decoded = jwt.verify(token, 'svc_secret');
    expect(decoded.userId).toBe('u');
    expect(decoded.aud).toBe('internal-services');
  });

  test('findServiceInstanceByEndpoint returns null on missing cache', async () => {
    routeCache.getRoute.mockResolvedValue(null);
    const res = await routing.findServiceInstanceByEndpoint('tickets');
    expect(res).toBeNull();
  });

  test('findServiceInstanceByEndpoint maps route and healthy instances', async () => {
    routeCache.getRoute.mockResolvedValue({ serviceKey: 'tickets', serviceName: 'Ticket', timeout: '5000', retries: '2' });
    routeCache.getHealthyServiceInstances.mockResolvedValue([{ id: 1, host: 'h', port: 1 }]);
    const res = await routing.findServiceInstanceByEndpoint('tickets');
    expect(res.instances.length).toBe(1);
    expect(res.timeout).toBe(5000);
    expect(res.retries).toBe(2);
  });

  test('generateServiceToken throws when secret missing', () => {
    delete process.env.SERVICE_JWT_SECRET;
    expect(() => routing.generateServiceToken({ id: 'u' })).toThrow('SERVICE_JWT_SECRET');
  });

  test('selectInstance returns null when empty, returns element otherwise', () => {
    expect(routing.selectInstance([])).toBeNull();
    const inst = routing.selectInstance([{ id: 1 }, { id: 2 }]);
    expect([1,2]).toContain(inst.id);
  });

  test('findServiceInstanceByEndpoint returns null when no healthy instances', async () => {
    routeCache.getRoute.mockResolvedValue({ serviceKey: 'tickets', serviceName: 'Ticket' });
    routeCache.getHealthyServiceInstances.mockResolvedValue([]);
    const res = await routing.findServiceInstanceByEndpoint('tickets');
    expect(res).toBeNull();
  });

  test('routeRequest proxies non-guest path with headers and success', async () => {
    const req = {
      url: '/v1/tickets/list?page=1',
      ip: '127.0.0.1',
      protocol: 'http',
      get: jest.fn(() => 'localhost:8000'),
      user: { id: 'u1', email: 'e', roles: ['r'] },
      isGuestRoute: false,
    };
    const res = new (require('events').EventEmitter)();
    res.status = jest.fn(() => res);
    res.set = jest.fn();
    res.get = jest.fn();
    routeCache.getRoute.mockResolvedValue({ serviceKey: 'tickets', serviceName: 'Ticket', timeout: '5000', retries: '1' });
    routeCache.getHealthyServiceInstances.mockResolvedValue([{ id: 1, host: 'h', port: 1 }]);
    await routing.routeRequest(req, res, 'tickets', 'list');
  });

  test('routeRequest throws when no service found', async () => {
    const req = { url: '/v1/tickets', get: jest.fn() };
    const res = new (require('events').EventEmitter)();
    routeCache.getRoute.mockResolvedValue(null);
    await expect(routing.routeRequest(req, res, 'tickets')).rejects.toThrow(/not found/);
  });

  test('routeRequest maps proxy error to CustomError', async () => {
    mockProxyImpl.mockImplementation((req, res, next) => next({ message: 'boom', statusCode: 502 }));
    const req = { url: '/v1/tickets', get: jest.fn(), ip: '', protocol: 'http' };
    const res = new (require('events').EventEmitter)();
    routeCache.getRoute.mockResolvedValue({ serviceKey: 'tickets', serviceName: 'Ticket' });
    routeCache.getHealthyServiceInstances.mockResolvedValue([{ id: 1, host: 'h', port: 1 }]);
    await expect(routing.routeRequest(req, res, 'tickets')).rejects.toThrow('Circuit breaker: service temporarily unavailable');
  });

  test('routeRequest wraps non-Custom errors from breaker', async () => {
    const req = { url: '/v1/tickets', get: jest.fn(), ip: '', protocol: 'http' };
    const res = new (require('events').EventEmitter)();
    routeCache.getRoute.mockResolvedValue({ serviceKey: 'tickets', serviceName: 'Ticket' });
    routeCache.getHealthyServiceInstances.mockResolvedValue([{ id: 1, host: 'h', port: 1 }]);
    jest.spyOn(routing, 'selectInstance').mockReturnValue({ id: 1, host: 'h', port: 1 });
    routing.proxyBreaker.fire = jest.fn().mockRejectedValue(new Error('generic-error'));
    await expect(routing.routeRequest(req, res, 'tickets')).rejects.toThrow(/Routing error: generic-error/);
  });

  test('checkServiceHealth returns unhealthy when no instances', async () => {
    routeCache.getRoute.mockResolvedValue({ serviceKey: 'users' });
    routeCache.getHealthyServiceInstances.mockResolvedValue([]);
    const res = await routing.checkServiceHealth('users');
    expect(res.healthy).toBe(false);
  });

  test('invalidateRouteCache handles single and all', async () => {
    routeCache.invalidateRoute.mockResolvedValue();
    routeCache.invalidateAllRoutes.mockResolvedValue();
    await expect(routing.invalidateRouteCache('x')).resolves.toBe(true);
    await expect(routing.invalidateRouteCache()).resolves.toBe(true);
  });

  test('proxy options build correct paths and headers for guest/non-guest', async () => {
    const proxy = require('express-http-proxy');
    // Trigger building middleware to capture options by calling proxyServiceRequest directly
    const req = {
      url: '/v1/tickets/list?x=1',
      ip: '127.0.0.1',
      protocol: 'http',
      get: jest.fn(() => 'localhost:8000'),
      user: { id: 'u1', email: 'e', roles: ['r'] },
    };
    const res = new (require('events').EventEmitter)();
    // Make proxy call synchronous
    mockProxyImpl.mockImplementationOnce((req, res, next) => next());
    await routing.proxyServiceRequest(req, res, { id: 1, host: 'h', port: 1 }, 'tickets', 'list');
    const opts = proxy.__getOptions();
    // path for non-guest
    const p1 = opts.proxyReqPathResolver({ url: '/anything?y=2', isGuestRoute: false });
    expect(p1).toBe('/v1/tickets/list?y=2');
    // guest path
    const p2 = opts.proxyReqPathResolver({ url: '/whatever?q=3', isGuestRoute: true });
    expect(p2).toBe('/list?q=3');
    // headers decorator
    const decorated = opts.proxyReqOptDecorator(
      { headers: {} },
      { ip: '1.1.1.1', protocol: 'http', get: jest.fn(()=>'h'), user: { id: 'u1', email: 'e', roles: ['r'] } }
    );
    expect(decorated.headers['x-service-auth']).toMatch(/^Bearer /);
    expect(decorated.headers['origin']).toBe('http://localhost:8000');
  });

  test('getCacheStats proxies to routeCache', async () => {
    routeCache.getCacheStats.mockResolvedValue({ a: 1 });
    await expect(routing.getCacheStats()).resolves.toEqual({ a: 1 });
  });

  test('proxy decorators: userResDecorator JSON success and parse error, header cleanup', async () => {
    const proxy = require('express-http-proxy');
    // Call proxyServiceRequest to capture options
    const req = { url: '/v1/tickets/x', get: jest.fn(), ip: '', protocol: 'http' };
    const res = new (require('events').EventEmitter)();
    // Make middleware immediately call next
    mockProxyImpl.mockImplementationOnce((req, res, next) => next());
    await routing.proxyServiceRequest(req, res, { id: 1, host: 'h', port: 1 }, 'tickets', 'x');
    const opts = proxy.__getOptions();

    // JSON success
    const userRes = { status: jest.fn(() => userRes) };
    const proxyResJSON = { statusCode: 201, headers: { 'content-type': 'application/json' } };
    const body = Buffer.from(JSON.stringify({ ok: true }), 'utf8');
    const out = opts.userResDecorator(proxyResJSON, body, { url: '/v1/tickets/x' }, userRes);
    expect(userRes.status).toHaveBeenCalledWith(201);
    expect(out).toBe(JSON.stringify({ ok: true }));

    // JSON parse error path
    const userRes2 = { status: jest.fn(() => userRes2) };
    const proxyResBad = { statusCode: 200, headers: { 'content-type': 'application/json' } };
    const bad = Buffer.from('{bad', 'utf8');
    const outBad = opts.userResDecorator(proxyResBad, bad, { url: '/v1/tickets/x' }, userRes2);
    expect(userRes2.status).toHaveBeenCalledWith(200);
    expect(outBad).toBe(bad);

    // Non-JSON path
    const userRes3 = { status: jest.fn(() => userRes3) };
    const proxyResText = { statusCode: 204, headers: { 'content-type': 'text/plain' } };
    const textBuf = Buffer.from('ok', 'utf8');
    const outText = opts.userResDecorator(proxyResText, textBuf, { url: '/v1/tickets/x' }, userRes3);
    expect(userRes3.status).toHaveBeenCalledWith(204);
    expect(outText).toBe(textBuf);

    // userResHeaderDecorator cleanup
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': '*',
      'access-control-allow-headers': '*',
      'access-control-expose-headers': '*',
      'access-control-max-age': '1',
      'x-other': 'v'
    };
    const cleaned = opts.userResHeaderDecorator({ ...headers }, {}, {}, {});
    expect(cleaned['x-other']).toBe('v');
    expect(cleaned['access-control-allow-origin']).toBeUndefined();
    expect(cleaned['access-control-allow-credentials']).toBeUndefined();
    expect(cleaned['access-control-allow-methods']).toBeUndefined();
    expect(cleaned['access-control-allow-headers']).toBeUndefined();
    expect(cleaned['access-control-expose-headers']).toBeUndefined();
    expect(cleaned['access-control-max-age']).toBeUndefined();
  });

  test('proxyReqOptDecorator without user does not set service auth', async () => {
    const proxy = require('express-http-proxy');
    const req = { url: '/v1/tickets/x', get: jest.fn(), ip: '', protocol: 'http' };
    const res = new (require('events').EventEmitter)();
    mockProxyImpl.mockImplementationOnce((req, res, next) => next());
    await routing.proxyServiceRequest(req, res, { id: 1, host: 'h', port: 1 }, 'tickets', 'x');
    const opts = proxy.__getOptions();
    const result = opts.proxyReqOptDecorator({ headers: {} }, { ip: '1', protocol: 'http', get: jest.fn(()=>'h') });
    expect(result.headers['x-service-auth']).toBeUndefined();
  });

  test('checkServiceHealth computes health summary', async () => {
    routeCache.getRoute.mockResolvedValue({ serviceKey: 'tickets', serviceName: 'Ticket' });
    routeCache.getHealthyServiceInstances.mockResolvedValue([{ id: 1, host: 'h', port: 1 }]);
    const res = await routing.checkServiceHealth('tickets');
    expect(res.healthy).toBe(true);
    expect(res.cached).toBe(true);
  });
});


