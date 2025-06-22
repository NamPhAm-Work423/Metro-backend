const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Create database backup
 * @param {Object} config - Backup configuration
 * @param {string} config.host - Database host
 * @param {number} config.port - Database port
 * @param {string} config.database - Database name
 * @param {string} config.username - Database username
 * @param {string} config.password - Database password
 * @param {string} config.backupDir - Directory to store backups
 * @returns {Promise<string>} Path to backup file
 */
const createBackup = async (config) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${config.database}_${timestamp}.sql`;
    const backupPath = path.join(config.backupDir, backupFileName);

    // Create backup directory if it doesn't exist
    await fs.mkdir(config.backupDir, { recursive: true });

    // Set PGPASSWORD environment variable
    process.env.PGPASSWORD = config.password;

    // Create backup using pg_dump
    const command = `pg_dump -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database} -F c -f "${backupPath}"`;
    await execAsync(command);

    console.log(`Backup created successfully: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
};

/**
 * Restore database from backup
 * @param {Object} config - Restore configuration
 * @param {string} config.host - Database host
 * @param {number} config.port - Database port
 * @param {string} config.database - Database name
 * @param {string} config.username - Database username
 * @param {string} config.password - Database password
 * @param {string} config.backupPath - Path to backup file
 * @returns {Promise} Restore result
 */
const restoreBackup = async (config) => {
  try {
    // Set PGPASSWORD environment variable
    process.env.PGPASSWORD = config.password;

    // Drop existing connections
    const dropConnections = `psql -h ${config.host} -p ${config.port} -U ${config.username} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${config.database}' AND pid <> pg_backend_pid();"`;
    await execAsync(dropConnections);

    // Drop and recreate database
    const dropDatabase = `psql -h ${config.host} -p ${config.port} -U ${config.username} -d postgres -c "DROP DATABASE IF EXISTS ${config.database};"`;
    await execAsync(dropDatabase);

    const createDatabase = `psql -h ${config.host} -p ${config.port} -U ${config.username} -d postgres -c "CREATE DATABASE ${config.database};"`;
    await execAsync(createDatabase);

    // Restore from backup
    const restoreCommand = `pg_restore -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database} "${config.backupPath}"`;
    await execAsync(restoreCommand);

    console.log('Database restored successfully');
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
};

/**
 * List available backups
 * @param {string} backupDir - Directory containing backups
 * @returns {Promise<Array>} List of backup files
 */
const listBackups = async (backupDir) => {
  try {
    const files = await fs.readdir(backupDir);
    const backups = files
      .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        size: fs.statSync(path.join(backupDir, file)).size,
        created: fs.statSync(path.join(backupDir, file)).birthtime
      }))
      .sort((a, b) => b.created - a.created);

    return backups;
  } catch (error) {
    console.error('Error listing backups:', error);
    throw error;
  }
};

/**
 * Delete old backups
 * @param {string} backupDir - Directory containing backups
 * @param {number} daysToKeep - Number of days to keep backups
 * @returns {Promise} Deletion result
 */
const deleteOldBackups = async (backupDir, daysToKeep) => {
  try {
    const backups = await listBackups(backupDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    for (const backup of backups) {
      if (backup.created < cutoffDate) {
        await fs.unlink(backup.path);
        console.log(`Deleted old backup: ${backup.name}`);
      }
    }

    console.log('Old backups deleted successfully');
  } catch (error) {
    console.error('Error deleting old backups:', error);
    throw error;
  }
};

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  deleteOldBackups
}; 