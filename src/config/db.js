const { Pool } = require('pg');
const { initializePool, query } = require('../helpers/database.helper');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'metro_db',
  password: process.env.DB_PASSWORD || 'your_secure_password',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Initialize database connection pool
const pool = initializePool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connected successfully:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

// Create database tables
const createTables = async () => {
  try {
    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Passengers table
    await query(`
      CREATE TABLE IF NOT EXISTS passengers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Stations table
    await query(`
      CREATE TABLE IF NOT EXISTS stations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        location VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Routes table
    await query(`
      CREATE TABLE IF NOT EXISTS routes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        start_station_id INTEGER REFERENCES stations(id),
        end_station_id INTEGER REFERENCES stations(id),
        distance DECIMAL(10,2),
        duration INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Schedules table
    await query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        route_id INTEGER REFERENCES routes(id),
        departure_time TIMESTAMP NOT NULL,
        arrival_time TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Fares table
    await query(`
      CREATE TABLE IF NOT EXISTS fares (
        id SERIAL PRIMARY KEY,
        route_id INTEGER REFERENCES routes(id),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tickets table
    await query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        passenger_id INTEGER REFERENCES passengers(id),
        route_id INTEGER REFERENCES routes(id),
        schedule_id INTEGER REFERENCES schedules(id),
        fare_id INTEGER REFERENCES fares(id),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Payments table
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Payment Gateways table
    await query(`
      CREATE TABLE IF NOT EXISTS payment_gateways (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        config JSONB,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Promotions table
    await query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        discount_percentage DECIMAL(5,2),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

// Create indexes
const createIndexes = async () => {
  try {
    // Users indexes
    await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    await query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);');

    // Passengers indexes
    await query('CREATE INDEX IF NOT EXISTS idx_passengers_user_id ON passengers(user_id);');

    // Stations indexes
    await query('CREATE INDEX IF NOT EXISTS idx_stations_code ON stations(code);');
    await query('CREATE INDEX IF NOT EXISTS idx_stations_status ON stations(status);');

    // Routes indexes
    await query('CREATE INDEX IF NOT EXISTS idx_routes_stations ON routes(start_station_id, end_station_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);');

    // Schedules indexes
    await query('CREATE INDEX IF NOT EXISTS idx_schedules_route ON schedules(route_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_schedules_times ON schedules(departure_time, arrival_time);');

    // Tickets indexes
    await query('CREATE INDEX IF NOT EXISTS idx_tickets_passenger ON tickets(passenger_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_tickets_route ON tickets(route_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_tickets_schedule ON tickets(schedule_id);');

    // Payments indexes
    await query('CREATE INDEX IF NOT EXISTS idx_payments_ticket ON payments(ticket_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);');

    // Promotions indexes
    await query('CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);');
    await query('CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);');

    console.log('All indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
};

// Initialize database
const initializeDatabase = async () => {
  try {
    await testConnection();
    await createTables();
    await createIndexes();
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  testConnection,
  initializeDatabase
};
