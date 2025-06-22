const fs = require('fs').promises;
const path = require('path');
const { query } = require('./database.helper');

/**
 * Create migrations table if it doesn't exist
 * @returns {Promise} Creation result
 */
const createMigrationsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await query(query);
};

/**
 * Get executed migrations
 * @returns {Promise<Array>} List of executed migrations
 */
const getExecutedMigrations = async () => {
  const result = await query('SELECT name FROM migrations ORDER BY id');
  return result.rows.map(row => row.name);
};

/**
 * Record migration execution
 * @param {string} name - Migration name
 * @returns {Promise} Recording result
 */
const recordMigration = async (name) => {
  await query('INSERT INTO migrations (name) VALUES ($1)', [name]);
};

/**
 * Execute migration file
 * @param {string} filePath - Path to migration file
 * @returns {Promise} Execution result
 */
const executeMigration = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  await query(content);
};

/**
 * Run all pending migrations
 * @param {string} migrationsDir - Directory containing migration files
 * @returns {Promise} Migration result
 */
const runMigrations = async (migrationsDir) => {
  try {
    // Create migrations table if it doesn't exist
    await createMigrationsTable();

    // Get list of migration files
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();

    // Execute pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file)) {
        console.log(`Executing migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        await executeMigration(filePath);
        await recordMigration(file);
        console.log(`Migration completed: ${file}`);
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
};

/**
 * Rollback last migration
 * @param {string} migrationsDir - Directory containing migration files
 * @returns {Promise} Rollback result
 */
const rollbackLastMigration = async (migrationsDir) => {
  try {
    // Get last executed migration
    const result = await query(
      'SELECT name FROM migrations ORDER BY id DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = result.rows[0].name;
    const rollbackFile = lastMigration.replace('.sql', '_rollback.sql');
    const rollbackPath = path.join(migrationsDir, rollbackFile);

    // Check if rollback file exists
    try {
      await fs.access(rollbackPath);
    } catch {
      console.error(`Rollback file not found: ${rollbackFile}`);
      return;
    }

    // Execute rollback
    console.log(`Rolling back migration: ${lastMigration}`);
    await executeMigration(rollbackPath);
    await query('DELETE FROM migrations WHERE name = $1', [lastMigration]);
    console.log(`Rollback completed: ${lastMigration}`);
  } catch (error) {
    console.error('Error rolling back migration:', error);
    throw error;
  }
};

/**
 * Create new migration file
 * @param {string} migrationsDir - Directory for migration files
 * @param {string} name - Migration name
 * @returns {Promise} Creation result
 */
const createMigration = async (migrationsDir, name) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}_${name}.sql`;
    const rollbackFileName = `${timestamp}_${name}_rollback.sql`;
    
    const filePath = path.join(migrationsDir, fileName);
    const rollbackPath = path.join(migrationsDir, rollbackFileName);

    // Create migration file
    await fs.writeFile(filePath, '-- Migration SQL\n');
    console.log(`Created migration file: ${fileName}`);

    // Create rollback file
    await fs.writeFile(rollbackPath, '-- Rollback SQL\n');
    console.log(`Created rollback file: ${rollbackFileName}`);
  } catch (error) {
    console.error('Error creating migration files:', error);
    throw error;
  }
};

module.exports = {
  runMigrations,
  rollbackLastMigration,
  createMigration
}; 