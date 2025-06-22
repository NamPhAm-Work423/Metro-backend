/**
 * Build SELECT query
 * @param {string} table - Table name
 * @param {Object} options - Query options
 * @returns {Object} Query object
 */
const buildSelectQuery = (table, options = {}) => {
  const {
    columns = '*',
    where = {},
    orderBy = [],
    limit,
    offset,
    joins = [],
    groupBy = [],
    having = {}
  } = options;

  let query = `SELECT ${Array.isArray(columns) ? columns.join(', ') : columns} FROM ${table}`;
  const values = [];
  let paramCount = 1;

  // Add JOIN clauses
  joins.forEach(join => {
    query += ` ${join.type || 'INNER'} JOIN ${join.table} ON ${join.condition}`;
  });

  // Add WHERE clause
  if (Object.keys(where).length > 0) {
    const conditions = [];
    Object.entries(where).forEach(([key, value]) => {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        conditions.push(`${key} = ANY($${paramCount})`);
        values.push(value);
        paramCount++;
      } else {
        conditions.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  // Add GROUP BY clause
  if (groupBy.length > 0) {
    query += ` GROUP BY ${groupBy.join(', ')}`;
  }

  // Add HAVING clause
  if (Object.keys(having).length > 0) {
    const conditions = [];
    Object.entries(having).forEach(([key, value]) => {
      conditions.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    });
    query += ` HAVING ${conditions.join(' AND ')}`;
  }

  // Add ORDER BY clause
  if (orderBy.length > 0) {
    const orders = orderBy.map(order => {
      const [column, direction] = Array.isArray(order) ? order : [order, 'ASC'];
      return `${column} ${direction.toUpperCase()}`;
    });
    query += ` ORDER BY ${orders.join(', ')}`;
  }

  // Add LIMIT and OFFSET
  if (limit) {
    query += ` LIMIT $${paramCount}`;
    values.push(limit);
    paramCount++;
  }

  if (offset) {
    query += ` OFFSET $${paramCount}`;
    values.push(offset);
  }

  return { text: query, values };
};

/**
 * Build INSERT query
 * @param {string} table - Table name
 * @param {Object} data - Data to insert
 * @param {string} returning - Columns to return
 * @returns {Object} Query object
 */
const buildInsertQuery = (table, data, returning = '*') => {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map((_, index) => `$${index + 1}`);

  const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING ${returning}
  `;

  return { text: query, values };
};

/**
 * Build UPDATE query
 * @param {string} table - Table name
 * @param {Object} data - Data to update
 * @param {Object} where - Where conditions
 * @param {string} returning - Columns to return
 * @returns {Object} Query object
 */
const buildUpdateQuery = (table, data, where = {}, returning = '*') => {
  const setClause = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(', ');

  const values = Object.values(data);
  let paramCount = values.length + 1;

  const whereClause = Object.entries(where)
    .map(([key, value]) => {
      const condition = `${key} = $${paramCount}`;
      values.push(value);
      paramCount++;
      return condition;
    })
    .join(' AND ');

  const query = `
    UPDATE ${table}
    SET ${setClause}
    ${whereClause ? `WHERE ${whereClause}` : ''}
    RETURNING ${returning}
  `;

  return { text: query, values };
};

/**
 * Build DELETE query
 * @param {string} table - Table name
 * @param {Object} where - Where conditions
 * @param {string} returning - Columns to return
 * @returns {Object} Query object
 */
const buildDeleteQuery = (table, where = {}, returning = '*') => {
  const values = [];
  let paramCount = 1;

  const whereClause = Object.entries(where)
    .map(([key, value]) => {
      const condition = `${key} = $${paramCount}`;
      values.push(value);
      paramCount++;
      return condition;
    })
    .join(' AND ');

  const query = `
    DELETE FROM ${table}
    ${whereClause ? `WHERE ${whereClause}` : ''}
    RETURNING ${returning}
  `;

  return { text: query, values };
};

/**
 * Build pagination query
 * @param {string} table - Table name
 * @param {Object} options - Query options
 * @returns {Object} Query object
 */
const buildPaginationQuery = (table, options = {}) => {
  const {
    page = 1,
    limit = 10,
    where = {},
    orderBy = [],
    columns = '*'
  } = options;

  const offset = (page - 1) * limit;

  return buildSelectQuery(table, {
    columns,
    where,
    orderBy,
    limit,
    offset
  });
};

module.exports = {
  buildSelectQuery,
  buildInsertQuery,
  buildUpdateQuery,
  buildDeleteQuery,
  buildPaginationQuery
}; 