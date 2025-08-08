jest.mock('../../src/services/repositories/user.repository', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
}));
jest.mock('../../src/services/email.service');
jest.mock('../../src/services/tokens.service');
jest.mock('../../src/events/user.producer.event', () => ({ publishUserCreated: jest.fn().mockResolvedValue() }));
jest.mock('../../src/events/user.consumer.event', () => ({ start: jest.fn().mockResolvedValue() }));
const redisState = { lastClient: null };
jest.mock('../../src/config/redis', () => ({ withRedisClient: (fn) => {
  const client = { set: jest.fn(), get: jest.fn(), ttl: jest.fn(), del: jest.fn() };
  redisState.lastClient = client;
  return fn(client);
} }));
jest.mock('../../src/config/database', () => ({}));

const userRepository = require('../../src/services/repositories/user.repository');
const tokensService = require('../../src/services/tokens.service');
const emailService = require('../../src/services/email.service');
const userService = require('../../src/services/user.service');
const { sha256 } = require('../../src/helpers/crypto.helper');
const redis = require('../../src/config/redis');

describe('UserService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('signup creates user and triggers background tasks', async () => {
    userRepository.findOne.mockResolvedValue(null);
    userRepository.create.mockResolvedValue({ id: 'u1', email: 'a@b.com', username: 'john', roles: ['passenger'] });
    const { user } = await userService.signup({ email: 'a@b.com', username: 'john', password: 'P@ssw0rd', roles: ['passenger'] });
    expect(user).toHaveProperty('id', 'u1');
  });

  test('signup rejects when roles include admin', async () => {
    await expect(userService.signup({ email: 'a@b.com', username: 'john', password: 'P@ssw0rd', roles: ['admin'] }))
      .rejects.toThrow('Admin role is not allowed to be created');
  });

  test('login validates password and returns tokens', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'u2',
      email: 'a@b.com',
      username: 'john',
      roles: ['passenger'],
      password: require('bcryptjs').hashSync('P@ssw0rd', 10),
      isLocked: () => false,
      resetLoginAttempts: jest.fn().mockResolvedValue(),
      update: jest.fn().mockResolvedValue(),
    });
    tokensService.createTokens.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
    const res = await userService.login('a@b.com', 'P@ssw0rd');
    expect(res).toHaveProperty('tokens');
  });

  test('login throws when password empty', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'u2', email: 'a@b.com', username: 'john', roles: ['passenger'], password: 'x', isLocked: () => false, isVerified: 'true' });
    await expect(userService.login('a@b.com', ''))
      .rejects.toThrow('Password is required');
  });

  test('login throws when user not found', async () => {
    userRepository.findOne.mockResolvedValue(null);
    await expect(userService.login('no@x.com', 'P@ssw0rd')).rejects.toThrow('User is not found');
  });

  test('login throws when account locked', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'u2', email: 'a@b.com', username: 'john', roles: ['passenger'], password: 'x', isLocked: () => true });
    await expect(userService.login('a@b.com', 'P@ssw0rd')).rejects.toThrow('Account is temporarily locked');
  });

  test('login throws when unverified and NEED_EMAIL_VERIFICATION=true', async () => {
    process.env.NEED_EMAIL_VERIFICATION = 'true';
    userRepository.findOne.mockResolvedValue({ id: 'u2', email: 'a@b.com', username: 'john', roles: ['passenger'], password: 'x', isLocked: () => false, isVerified: 'false' });
    await expect(userService.login('a@b.com', 'P@ssw0rd')).rejects.toThrow('Please verify your email address');
    process.env.NEED_EMAIL_VERIFICATION = 'false';
  });

  test('forgotPassword happy path stores token and sends email', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    emailService.sendPasswordResetEmail.mockResolvedValue({ ok: true });
    const ok = await userService.forgotPassword('a@b.com');
    expect(ok).toBe(true);
    expect(redisState.lastClient.set).toHaveBeenCalled();
  });

  test('forgotPassword cleans up redis on email failure', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    emailService.sendPasswordResetEmail.mockRejectedValue(new Error('smtp'));
    const ok = await userService.forgotPassword('a@b.com');
    expect(ok).toBe(true);
    // cleanup del called in background; wait for setImmediate
    await new Promise(r => setImmediate(r));
    expect(redisState.lastClient.del).toHaveBeenCalled();
  });

  test('resetPassword invalid or expired token', async () => {
    // withRedisClient get returns a value not matching hashed
    redisState.lastClient = { get: jest.fn().mockResolvedValue('different') };
    redis.withRedisClient = (fn) => fn(redisState.lastClient);
    await expect(userService.resetPassword('tok', 'uid', 'P@ssw0rd')).rejects.toThrow('Invalid or expired reset token');
  });

  test('verifyEmailToken success', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: 'u5' }, process.env.JWT_ACCESS_SECRET);
    userRepository.findByPk.mockResolvedValue({ id: 'u5', email: 'v@x.com', update: jest.fn().mockResolvedValue() });
    const res = await userService.verifyEmailToken(token);
    expect(res.success).toBe(true);
  });

  test('unlockUserAccount not found', async () => {
    userRepository.findByPk.mockResolvedValue(null);
    const res = await userService.unlockUserAccount('no', 'admin');
    expect(res.success).toBe(false);
  });

  test('refreshToken returns new access token', async () => {
    const jwt = require('jsonwebtoken');
    const rt = jwt.sign({ userId: 'u3', username: 'john' }, process.env.JWT_REFRESH_SECRET);
    userRepository.findByPk.mockResolvedValue({ id: 'u3', username: 'john', roles: [] });
    tokensService.refreshAccessToken.mockResolvedValue({ accessToken: 'newA' });
    const res = await userService.refreshToken(rt);
    expect(res).toEqual({ accessToken: 'newA', user: { id: 'u3', username: 'john', roles: [] } });
  });

  test('refreshToken throws when user not found', async () => {
    const jwt = require('jsonwebtoken');
    const rt = jwt.sign({ userId: 'no' }, process.env.JWT_REFRESH_SECRET);
    userRepository.findByPk.mockResolvedValue(null);
    await expect(userService.refreshToken(rt)).rejects.toThrow('User not found');
  });

  test('forgotPassword returns true for unknown email', async () => {
    userRepository.findOne.mockResolvedValue(null);
    const ok = await userService.forgotPassword('none@x.com');
    expect(ok).toBe(true);
  });

  test('forgotPassword throws when Redis unavailable', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    // Simulate redis layer returning null
    const redis = require('../../src/config/redis');
    redis.withRedisClient = async () => null;
    await expect(userService.forgotPassword('a@b.com'))
      .rejects.toThrow('Failed to generate password reset token - Redis unavailable');
  });

  test('resetPassword rejects with short password', async () => {
    await expect(userService.resetPassword('tok', 'uid', 'a'))
      .rejects.toThrow('Password must be at least 6 characters');
  });

  test('resetPassword success flow', async () => {
    // prepare stored token = sha256('tok')
    const hashed = sha256('tok');
    redisState.lastClient = { get: jest.fn().mockResolvedValue(hashed), del: jest.fn().mockResolvedValue(1) };
    const redis = require('../../src/config/redis');
    redis.withRedisClient = (fn) => fn(redisState.lastClient);
    userRepository.findByPk.mockResolvedValue({ id: 'u1', email: 'a@b.com', update: jest.fn().mockResolvedValue() });
    const ok = await userService.resetPassword('tok', 'u1', 'P@ssw0rd');
    expect(ok).toBe(true);
    expect(redisState.lastClient.del).toHaveBeenCalled();
  });

  test('checkResetToken returns exists and ttl', async () => {
    const client = { get: jest.fn().mockResolvedValue('x'), ttl: jest.fn().mockResolvedValue(10) };
    redis.withRedisClient = (fn) => fn(client);
    const res = await userService.checkResetToken('u1');
    expect(res.exists).toBe(true);
    expect(res.ttlSeconds).toBe(10);
  });

  test('revokeResetToken returns true when deleted', async () => {
    const client = { del: jest.fn().mockResolvedValue(1) };
    redis.withRedisClient = (fn) => fn(client);
    const ok = await userService.revokeResetToken('u1');
    expect(ok).toBe(true);
  });

  test('checkResetToken handles Redis error path', async () => {
    const redis = require('../../src/config/redis');
    // Cause withRedisClient to throw
    redis.withRedisClient = async () => { throw new Error('down'); };
    const res = await userService.checkResetToken('u1');
    expect(res).toEqual({ exists: false, ttlSeconds: -1, expiresAt: null });
  });

  test('verifyEmailToken invalid token returns false', async () => {
    const res = await userService.verifyEmailToken('invalid.token');
    expect(res.success).toBe(false);
  });

  test('unlockUserAccount success', async () => {
    const mockUser = { id: 'u1', email: 'a@b.com', accountLocked: true, lockUntil: null, loginAttempts: 3, update: jest.fn().mockResolvedValue() };
    userRepository.findByPk.mockResolvedValue(mockUser);
    const res = await userService.unlockUserAccount('u1', 'admin');
    expect(res.success).toBe(true);
  });
});


