const { Pool } = require('pg');

let pool;

/**
 * Initialize database connection pool
 * @param {Object} config - Database configuration
 * @returns {Pool} PostgreSQL connection pool
 */
const initializePool = (config) => {
  pool = new Pool({
    user: config.user,
    host: config.host,
    database: config.database,
    password: config.password,
    port: config.port,
    ssl: config.ssl ? { rejectUnauthorized: false } : false
  });

  // Test the connection
  pool.on('connect', () => {
    console.log('PostgreSQL connected successfully');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  return pool;
};

/**
 * Execute a query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
const query = async (text, params) => {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
};

/**
 * Get a client from the pool
 * @returns {Promise} Client promise
 */
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
    console.error(`The last executed query on this client was: ${client.lastQuery}`);
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };

  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
};

/**
 * Execute a transaction
 * @param {Function} callback - Transaction callback
 * @returns {Promise} Transaction result
 */
const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Create database tables
 * @param {Array} tables - Array of table creation SQL statements
 * @returns {Promise} Creation result
 */
const createTables = async (tables) => {
  try {
    for (const table of tables) {
      await query(table);
    }
    console.log('Tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

/**
 * Drop database tables
 * @param {Array} tableNames - Array of table names to drop
 * @returns {Promise} Drop result
 */
const dropTables = async (tableNames) => {
  try {
    for (const tableName of tableNames) {
      await query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
    }
    console.log('Tables dropped successfully');
  } catch (error) {
    console.error('Error dropping tables:', error);
    throw error;
  }
};

/**
 * Get database statistics
 * @returns {Promise} Statistics result
 */
const getDBStats = async () => {
  try {
    const stats = await query(`
      SELECT 
        schemaname,
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size,
        pg_size_pretty(pg_relation_size(relid)) as table_size,
        pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC;
    `);
    return stats.rows;
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
};

/**
 * Close database connection pool
 * @returns {Promise} Close result
 */
const closePool = async () => {
  try {
    await pool.end();
    console.log('PostgreSQL connection pool closed');
  } catch (error) {
    console.error('Error closing PostgreSQL connection pool:', error);
    throw error;
  }
};

module.exports = {
  initializePool,
  query,
  getClient,
  transaction,
  createTables,
  dropTables,
  getDBStats,
  closePool
}; 