// Provide an in-memory Sequelize instance to avoid real DB and side-effects
jest.mock('../../src/config/database', () => {
    const { Sequelize } = require('sequelize');
    // Use postgres dialect to avoid sqlite3 native dependency; no real connection is made without authenticate
    const sequelize = new Sequelize('postgres://user:pass@localhost:5432/testdb', {
        dialect: 'postgres',
        logging: false,
    });
    // Prevent any authentication attempts
    sequelize.authenticate = jest.fn().mockResolvedValue();
    return sequelize;
});

// Mute noisy console during tests to prevent "Cannot log after tests are done"
const noop = () => {};
jest.spyOn(console, 'error').mockImplementation(noop);
jest.spyOn(console, 'log').mockImplementation(noop);
jest.spyOn(console, 'warn').mockImplementation(noop);

