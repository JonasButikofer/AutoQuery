const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const knex = require('knex');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// Helper function: Create a new Knex instance with given connection details
function createKnexInstance({ host, user, password, database = '' }) {
  return knex({
    client: 'mysql2',
    connection: { host, user, password, database },
    pool: { min: 0, max: 10 },
  });
}

// Helper function for error handling with context
function handleError(res, err, message, context) {
  console.error(`Context: ${context} - ${message}:`, err);
  return res.status(500).json({
    error: message,
    details: err.message,
    context: context,
  });
}

// Endpoint to test connection (connect to a specific database)
app.post('/api/connect', (req, res) => {
  const { host, user, password, database } = req.body;
  const dbInstance = createKnexInstance({ host, user, password, database });

  dbInstance
    .raw('SELECT 1')
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
  const dbInstance = createKnexInstance({ host, user, password });

  dbInstance
    .raw('SHOW DATABASES')
    .then((results) => {
      // results[0] is an array of objects like { Database: 'dbName' }
      const databases = results[0].map((row) => row.Database);
      res.json({ databases });
      dbInstance.destroy();
    })
    .catch((err) => {
      dbInstance.destroy();
      return handleError(res, err, 'Error fetching databases', 'POST /api/databases');
    });
});

// Endpoint to fetch tables of a selected database
app.post('/api/tables', (req, res) => {
  const { host, user, password, database } = req.body;
  const dbInstance = createKnexInstance({ host, user, password, database });

  dbInstance
    .raw('SHOW TABLES')
    .then((results) => {
      if (!results || !results[0]) {
        return res.status(404).json({ error: 'No tables found in the selected database.' });
      }
      // MySQL returns keys like "Tables_in_<database>"
      const key = `Tables_in_${database}`;
      const tables = results[0].map((row) => row[key]);
      res.json(tables);
      dbInstance.destroy();
    })
    .catch((err) => {
      dbInstance.destroy();
      return handleError(res, err, 'Error fetching tables', 'POST /api/tables');
    });
});

// Endpoint to fetch columns of a selected table
app.post('/api/columns', (req, res) => {
  const { host, user, password, database, table } = req.body;
  const dbInstance = createKnexInstance({ host, user, password, database });

  // Using parameterized query for safety
  dbInstance
    .raw('SHOW COLUMNS FROM ??', [table])
    .then((results) => {
      if (!results || !results[0]) {
        return res.status(404).json({ error: `No columns found for the table '${table}'` });
      }
      const columns = results[0].map((row) => row.Field);
      res.json(columns);
      dbInstance.destroy();
    })
    .catch((err) => {
      dbInstance.destroy();
      return handleError(res, err, `Error fetching columns for table '${table}'`, 'POST /api/columns');
    });
});

// Endpoint to run a query with dynamic columns, filters, and joins
app.post('/api/query', (req, res) => {
  const { host, user, password, database, table, columns, filters, joins } = req.body;

  if (!columns || columns.length === 0) {
    return res.status(400).json({ error: 'Please select at least one column' });
  }

  const dbInstance = createKnexInstance({ host, user, password, database });

  // Handle columns with table prefixes (e.g., "table.column")
  const selectColumns = columns.map((col) => {
    if (col.includes('.')) {
      const [tableName, columnName] = col.split('.');
      return `${tableName}.${columnName}`;
    }
    return col;
  });

  let query = dbInstance(table).select(selectColumns);

  // Apply filters
  if (filters && typeof filters === 'object') {
    Object.keys(filters).forEach((col) => {
      const filter = filters[col];
      if (filter) {
        if (isNaN(filter)) {
          query.where(col, 'LIKE', `%${filter}%`);
        } else if (filter.includes(',')) {
          const range = filter.split(',').map((val) => val.trim());
          query.whereBetween(col, range);
        } else {
          query.where(col, '=', filter);
        }
      }
    });
  }

  // Apply joins
  if (joins && joins.length > 0) {
    joins.forEach((join) => {
      const joinMethod = join.joinType === 'INNER' ? 'join' : join.joinType === 'LEFT' ? 'leftJoin' : join.joinType === 'RIGHT' ? 'rightJoin' : 'join';

      query[joinMethod](
        join.joinTable,
        `${table}.${join.primaryKey}`,
        '=',
        `${join.joinTable}.${join.foreignKey}`
      );
    });
  }

  // Execute the query
  query
    .then((results) => {
      if (!results || results.length === 0) {
        return res.status(404).json({ error: 'No results found for the query' });
      }
      res.json(results);
      dbInstance.destroy();
    })
    .catch((err) => {
      dbInstance.destroy();
      return handleError(res, err, 'Error executing query', 'POST /api/query');
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});