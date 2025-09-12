// Silence DB connect retry logs and avoid real connections during tests
jest.mock('../src/config/database', () => ({
  sequelize: { sync: jest.fn().mockResolvedValue(), close: jest.fn() },
}));

