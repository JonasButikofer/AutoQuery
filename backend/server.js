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

// Endpoint to run a dynamic query with columns, filters, and joins
app.post('/api/query', (req, res) => {
  const { host, user, password, database, table, columns, filters, joins } = req.body;
  console.log('Query Request:', { host, user, database, table, columns, filters, joins });

  if (!columns || columns.length === 0) {
    return res.status(400).json({ error: 'Please select at least one column' });
  }

  const dbInstance = createKnexInstance({ host, user, password, database });

  // Prepare the select columns. For any column not qualified (without a dot), prefix it with the base table.
  let selectColumns = columns.map(col => {
    if (col.includes('.')) {
      const [tbl, colName] = col.split('.');
      return `${tbl}.${colName} as ${tbl}_${colName}`;
    }
    return `${table}.${col} as ${table}_${col}`;
  });
  console.log('Select Columns:', selectColumns);

  // Build the base query from the base table
  let query = dbInstance(table).select(selectColumns);

  // Apply dynamic filters
  if (filters && typeof filters === 'object') {
    Object.entries(filters).forEach(([column, value]) => {
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

  // Apply dynamic joins
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

      // If join.joinColumns is provided and not empty, add them to the select clause;
      // otherwise, add the foreignKey column as default.
      if (join.joinColumns && Array.isArray(join.joinColumns) && join.joinColumns.length > 0) {
        join.joinColumns.forEach(col => {
          const qualified = `${join.joinTable}.${col}`;
          const aliased = `${join.joinTable}_${col}`;
          if (!selectColumns.some(sc => sc.includes(`${join.joinTable}.${col}`))) {
            selectColumns.push(`${qualified} as ${aliased}`);
          }
        });
      } else {
        // Automatically add the foreignKey from the joined table if no join columns provided.
        const qualified = `${join.joinTable}.${join.foreignKey}`;
        const aliased = `${join.joinTable}_${join.foreignKey}`;
        if (!selectColumns.some(sc => sc.includes(`${join.joinTable}.${join.foreignKey}`))) {
          selectColumns.push(`${qualified} as ${aliased}`);
        }
      }
    });
  }

  // Reapply the expanded selectColumns array to the query.
  query.select(selectColumns);
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
