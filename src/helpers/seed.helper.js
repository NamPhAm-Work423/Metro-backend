const fs = require('fs').promises;
const path = require('path');
const { query } = require('./database.helper');

/**
 * Create seeds table if it doesn't exist
 * @returns {Promise} Creation result
 */
const createSeedsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS seeds (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await query(query);
};

/**
 * Get executed seeds
 * @returns {Promise<Array>} List of executed seeds
 */
const getExecutedSeeds = async () => {
  const result = await query('SELECT name FROM seeds ORDER BY id');
  return result.rows.map(row => row.name);
};

/**
 * Record seed execution
 * @param {string} name - Seed name
 * @returns {Promise} Recording result
 */
const recordSeed = async (name) => {
  await query('INSERT INTO seeds (name) VALUES ($1)', [name]);
};

/**
 * Execute seed file
 * @param {string} filePath - Path to seed file
 * @returns {Promise} Execution result
 */
const executeSeed = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  await query(content);
};

/**
 * Run all pending seeds
 * @param {string} seedsDir - Directory containing seed files
 * @returns {Promise} Seeding result
 */
const runSeeds = async (seedsDir) => {
  try {
    // Create seeds table if it doesn't exist
    await createSeedsTable();

    // Get list of seed files
    const files = await fs.readdir(seedsDir);
    const seedFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Get executed seeds
    const executedSeeds = await getExecutedSeeds();

    // Execute pending seeds
    for (const file of seedFiles) {
      if (!executedSeeds.includes(file)) {
        console.log(`Executing seed: ${file}`);
        const filePath = path.join(seedsDir, file);
        await executeSeed(filePath);
        await recordSeed(file);
        console.log(`Seed completed: ${file}`);
      }
    }

    console.log('All seeds completed successfully');
  } catch (error) {
    console.error('Error running seeds:', error);
    throw error;
  }
};

/**
 * Create new seed file
 * @param {string} seedsDir - Directory for seed files
 * @param {string} name - Seed name
 * @returns {Promise} Creation result
 */
const createSeed = async (seedsDir, name) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}_${name}.sql`;
    const filePath = path.join(seedsDir, fileName);

    // Create seed file with template
    const template = `-- Seed data for ${name}
-- Example:
-- INSERT INTO table_name (column1, column2) VALUES (value1, value2);
`;
    await fs.writeFile(filePath, template);
    console.log(`Created seed file: ${fileName}`);
  } catch (error) {
    console.error('Error creating seed file:', error);
    throw error;
  }
};

/**
 * Clear all seed data
 * @param {Array<string>} tables - List of tables to clear
 * @returns {Promise} Clear result
 */
const clearSeeds = async (tables) => {
  try {
    // Disable foreign key checks temporarily
    await query('SET CONSTRAINTS ALL DEFERRED');

    // Clear each table
    for (const table of tables) {
      console.log(`Clearing table: ${table}`);
      await query(`TRUNCATE TABLE ${table} CASCADE`);
    }

    // Re-enable foreign key checks
    await query('SET CONSTRAINTS ALL IMMEDIATE');

    // Clear seeds table
    await query('TRUNCATE TABLE seeds');

    console.log('All seed data cleared successfully');
  } catch (error) {
    console.error('Error clearing seed data:', error);
    throw error;
  }
};

module.exports = {
  runSeeds,
  createSeed,
  clearSeeds
}; 