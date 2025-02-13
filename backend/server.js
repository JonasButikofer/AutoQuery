const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const knex = require('knex');
const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// Create a Knex instance using dynamic connection details
function createKnexInstance({ host, user, password, database = '' }) {
  return knex({
    client: 'mysql2',
    connection: { host, user, password, database },
    pool: { min: 0, max: 10 },
  });
}

// Error handler with debugging info
function handleError(res, err, message, context) {
  console.error(`Context: ${context} - ${message}:`, err);
  return res.status(500).json({ 
    error: message,
    details: err.message,
    context: context,
    sql: err.sql || 'No SQL provided',
  });
}

// Endpoint to test connection
app.post('/api/connect', (req, res) => {
  const { host, user, password, database } = req.body;
  console.log('Connect Request:', { host, user, database });
  const dbInstance = createKnexInstance({ host, user, password, database });
  dbInstance.raw('SELECT 1')
    .then(() => {
      res.json({ message: 'Successfully connected to the database' });
      dbInstance.destroy();
    })
    .catch((err) => {
      dbInstance.destroy();
      return handleError(res, err, 'Error connecting to the database', 'POST /api/connect');
    });
});

// Endpoint to fetch list of databases
app.post('/api/databases', (req, res) => {
  const { host, user, password } = req.body;
  console.log('Databases Request:', { host, user });
  const dbInstance = createKnexInstance({ host, user, password });
  dbInstance.raw('SHOW DATABASES')
    .then((results) => {
      const databases = results[0].map(row => row.Database);
      console.log('Databases found:', databases);
      res.json({ databases });
      dbInstance.destroy();
    })
    .catch((err) => {
      dbInstance.destroy();
      return handleError(res, err, 'Error fetching databases', 'POST /api/databases');
    });
});

// Endpoint to fetch tables from a selected database
app.post('/api/tables', (req, res) => {
  const { host, user, password, database } = req.body;
  console.log('Tables Request:', { host, user, database });
  const dbInstance = createKnexInstance({ host, user, password, database });
  dbInstance.raw('SHOW TABLES')
    .then((results) => {
      const key = `Tables_in_${database}`;
      const tables = results[0].map(row => row[key]);
      console.log('Tables found:', tables);
      res.json(tables);
      dbInstance.destroy();
    })
    .catch((err) => {
      dbInstance.destroy();
      return handleError(res, err, 'Error fetching tables', 'POST /api/tables');
    });
});

// Endpoint to fetch columns from a selected table
app.post('/api/columns', (req, res) => {
  const { host, user, password, database, table } = req.body;
  console.log('Columns Request:', { host, user, database, table });
  const dbInstance = createKnexInstance({ host, user, password, database });
  dbInstance.raw('SHOW COLUMNS FROM ??', [table])
    .then((results) => {
      const columns = results[0].map(row => row.Field);
      console.log(`Columns found in table ${table}:`, columns);
      res.json(columns);
      dbInstance.destroy();
    })
    .catch((err) => {
      dbInstance.destroy();
      return handleError(res, err, `Error fetching columns for table '${table}'`, 'POST /api/columns');
    });
});

// Endpoint to run a dynamic query with columns, filters, joins, groupBy, aggregates, and orderBy
app.post('/api/query', (req, res) => {
  const { host, user, password, database, table, columns, filters, joins } = req.body;
  console.log('Query Request:', { host, user, database, table, columns, filters, joins });

  if (!columns || columns.length === 0) {
    return res.status(400).json({ error: 'Please select at least one column' });
  }

  const dbInstance = createKnexInstance({ host, user, password, database });

  // Prepare the select columns.
  let selectColumns = columns.map(col => {
    if (col.includes('.')) {
      const [tbl, colName] = col.split('.');
      return `${tbl}.${colName} as ${tbl}_${colName}`;
    }
    return `${table}.${col} as ${table}_${col}`;
  });
  console.log('Select Columns:', selectColumns);

  // Build the base query from the base table.
  let query = dbInstance(table).select(selectColumns);

  // --- Apply dynamic WHERE filters ---
  if (filters && typeof filters === 'object') {
    // Use the nested "filters" property for actual column filters.
    const whereFilters = filters.filters || {};
    Object.entries(whereFilters).forEach(([column, value]) => {
      if (!value) return;
      if (Array.isArray(value)) {
        query.whereIn(column, value);
      } else if (typeof value === 'string' && value.includes(',')) {
        query.whereBetween(column, value.split(',').map(v => v.trim()));
      } else {
        query.where(column, 'like', `%${value}%`);
      }
    });
  }

  // --- Apply dynamic joins ---
  if (joins && Array.isArray(joins) && joins.length > 0) {
    joins.forEach(join => {
      if (!join.joinTable || !join.primaryKey || !join.foreignKey) {
        console.warn('Skipping invalid join:', join);
        return;
      }
      // Use join.primaryTable if provided; otherwise, default to base table.
      const primaryTbl = join.primaryTable || table;
      const joinMethod = {
        INNER: 'join',
        LEFT: 'leftJoin',
        RIGHT: 'rightJoin'
      }[join.joinType] || 'leftJoin';

      console.log(`Applying ${join.joinType || 'LEFT'} join: ${primaryTbl}.${join.primaryKey} = ${join.joinTable}.${join.foreignKey}`);

      query = query[joinMethod](
        join.joinTable,
        `${primaryTbl}.${join.primaryKey}`,
        '=',
        `${join.joinTable}.${join.foreignKey}`
      );

      // If join.joinColumns is provided, add them to the select clause.
      if (join.joinColumns && Array.isArray(join.joinColumns) && join.joinColumns.length > 0) {
        join.joinColumns.forEach(col => {
          const qualified = `${join.joinTable}.${col}`;
          const aliased = `${join.joinTable}_${col}`;
          if (!selectColumns.some(sc => sc.includes(`${join.joinTable}.${col}`))) {
            selectColumns.push(`${qualified} as ${aliased}`);
          }
        });
      } else {
        // Otherwise, add the foreign key column as default.
        const qualified = `${join.joinTable}.${join.foreignKey}`;
        const aliased = `${join.joinTable}_${join.foreignKey}`;
        if (!selectColumns.some(sc => sc.includes(`${join.joinTable}.${join.foreignKey}`))) {
          selectColumns.push(`${qualified} as ${aliased}`);
        }
      }
    });
    // Reapply expanded selectColumns to the query.
    query.select(selectColumns);
  }

  // --- Process Group By ---
  if (filters && Array.isArray(filters.groupBy) && filters.groupBy.length > 0) {
    query.groupBy(filters.groupBy);
  }

  // --- Process Aggregates ---
  if (filters && Array.isArray(filters.aggregates) && filters.aggregates.length > 0) {
    filters.aggregates.forEach(agg => {
      if (agg.column && agg.func) {
        const colQualified = agg.column.includes('.') ? agg.column : `${table}.${agg.column}`;
        const alias = `${agg.func.toLowerCase()}_${agg.column.replace('.', '_')}`;
        // Use knex.raw to add the aggregate expression.
        selectColumns.push(dbInstance.raw(`${agg.func}(${colQualified}) as ${alias}`));
      }
    });
    query.select(selectColumns);
  }

  // --- Process Order By ---
  if (filters && Array.isArray(filters.orderBy) && filters.orderBy.length > 0) {
    filters.orderBy.forEach(order => {
      if (order.column && order.direction) {
        query.orderBy(order.column, order.direction);
      }
    });
  }

  const sqlQuery = query.toString();
  console.log('Generated SQL query:', sqlQuery);

  query
    .then(results => {
      console.log('Query Results:', results);
      if (!results.length) return res.status(404).json({ error: 'No results found' });
      res.json(results);
      dbInstance.destroy();
    })
    .catch(err => {
      dbInstance.destroy();
      console.error('Query Error:', err);
      return handleError(res, err, 'Error executing query', 'POST /api/query');
    });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
