const express = require('express');
const request = require('supertest');

// ---- Global mocks ----
// Mock config root export used by some modules
jest.mock('../../../src', () => ({ jwt: { secret: 'test' } }));

// Bypass auth middleware for routes that require it
jest.mock('../../../src/middlewares/auth.middleware', () => ({
  authenticate: (req, res, next) => next(),
  authorize: () => (req, res, next) => next(),
}));

// Mock UserService – we will control behaviour inside each test
jest.mock('../../../src/services/user.service');
const userService = require('../../../src/services/user.service');

const authRoutes = require('../../../src/routes/auth.route');

// insert after global mocks comment
jest.mock('../../../src/config/database', () => {
  const { Sequelize } = require('sequelize');
  return new Sequelize('sqlite::memory:', { logging: false });
});

// Helper to build a minimal express app with error handler
const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/v1/auth', authRoutes);
  // Global error handler so we can assert status codes
  app.use((err, req, res, next) => {
    const status = err.status || 400;
    res.status(status).json({ success: false, message: err.message });
  });
  return app;
};

// A sample user object with toJSON implemented (controller strips password via toJSON)
const makeUser = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'john@example.com',
  username: 'john',
  toJSON() {
    return { id: this.id, email: this.email, username: this.username, ...overrides };
  },
  ...overrides,
});

// ---------------------------------------------
// UNIT-like tests (controller → service interaction mocked)
// ---------------------------------------------

describe('Auth Controller – Registration & Login (unit style)', () => {
  const app = buildApp();

  afterEach(() => jest.clearAllMocks());

  // ---------- Register ----------
  it('POST /register – success', async () => {
    const fakeUser = makeUser();
    userService.signup.mockResolvedValue({ user: fakeUser, tokens: { accessToken: 'atk', refreshToken: 'rtk' } });

    const res = await request(app).post('/v1/auth/register').send({
      firstName: 'John',
      lastName: 'Doe',
      email: fakeUser.email,
      password: 'Password123',
      username: 'john',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(userService.signup).toHaveBeenCalled();
  });

  it('POST /register – duplicate email', async () => {
    userService.signup.mockRejectedValue(Object.assign(new Error('User already exists'), { status: 409 }));

    const res = await request(app).post('/v1/auth/register').send({
      firstName: 'John',
      lastName: 'Doe',
      email: 'dup@example.com',
      password: 'Password123',
      username: 'john',
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // ---------- Login ----------
  it('POST /login – success', async () => {
    const fakeUser = makeUser();
    userService.login.mockResolvedValue({ user: fakeUser, tokens: { accessToken: 'atk', refreshToken: 'rtk' } });

    const res = await request(app).post('/v1/auth/login').send({
      email: fakeUser.email,
      password: 'Password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(userService.login).toHaveBeenCalledWith(fakeUser.email, 'Password123');
  });

  it('POST /login – wrong password', async () => {
    userService.login.mockRejectedValue(Object.assign(new Error('Invalid email or password'), { status: 401 }));

    const res = await request(app).post('/v1/auth/login').send({
      email: 'john@example.com',
      password: 'wrongPass',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('POST /login – missing field', async () => {
    const res = await request(app).post('/v1/auth/login').send({ password: 'noEmail' });

    // service not called -> controller should respond 401/400 depending on impl; assert 401
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------
// Integration-like tests with SQLite in-memory
// (optional full flow) – demonstrating real DB
// ---------------------------------------------

const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

describe('Auth Controller – integration with in-memory SQLite', () => {
  const sequelize = new Sequelize('sqlite::memory:', { logging: false });
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    email: { type: DataTypes.STRING, unique: true },
    username: DataTypes.STRING,
    password: DataTypes.STRING,
    isVerified: DataTypes.BOOLEAN,
  });

  // Re-implement userService using this transient DB
  const realUserService = {
    signup: async ({ firstName, lastName, email, password, username }) => {
      const dup = await User.findOne({ where: { email } });
      if (dup) throw Object.assign(new Error('User already exists'), { status: 409 });
      const hash = await bcrypt.hash(password, 10);
      const user = await User.create({ email, username, password: hash, isVerified: true });
      return { user, tokens: { accessToken: 'atk', refreshToken: 'rtk' } };
    },
    login: async (email, password) => {
      const user = await User.findOne({ where: { email } });
      if (!user) throw Object.assign(new Error('Invalid email or password'), { status: 401 });
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) throw Object.assign(new Error('Invalid email or password'), { status: 401 });
      return { user, tokens: { accessToken: 'atk', refreshToken: 'rtk' } };
    },
  };

  // Swap mock with real implementation for this block
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    userService.signup.mockImplementation(realUserService.signup);
    userService.login.mockImplementation(realUserService.login);
  });
  afterEach(() => jest.clearAllMocks());

  const app = buildApp();

  it('integration – register → login success', async () => {
    const email = 'int@example.com';
    await request(app).post('/v1/auth/register').send({
      firstName: 'A',
      lastName: 'B',
      email,
      password: '12345678',
      username: 'ab',
    }).expect(201);

    await request(app).post('/v1/auth/login').send({ email, password: '12345678' }).expect(200);
  });
}); 