import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import AdvancedFilters from './advancedFilters';

function App() {
  // Connection/Login States
  const [host, setHost] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');

  // Database/Table/Column States
  const [databases, setDatabases] = useState([]);
  const [tables, setTables] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [data, setData] = useState([]);

  // Advanced filters state (the AdvancedFilters component returns a nested object)
  const [advancedFilters, setAdvancedFilters] = useState({});

  // Join-related states
  const [joins, setJoins] = useState([]);

  // Handle login and fetch databases
  const handleLogin = () => {
    if (host && user && password) {
      fetchDatabases();
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('Please enter all login fields');
    }
  };

  // Fetch list of databases from backend
  const fetchDatabases = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/databases', {
        host,
        user,
        password,
      });
      setDatabases(response.data.databases);
    } catch (err) {
      setError('Error fetching databases');
    }
  };

  // Fetch tables for the selected database
  const fetchTables = async (database) => {
    setSelectedDatabase(database);
    setSelectedTable('');
    setColumns([]);
    setSelectedColumns([]);
    setData([]);
    setAdvancedFilters({});
    setJoins([]); // Reset joins when database changes
    try {
      const response = await axios.post('http://localhost:5000/api/tables', {
        host,
        user,
        password,
        database,
      });
      setTables(response.data);
    } catch (err) {
      setError('Error fetching tables');
    }
  };

  // Fetch columns for the selected table
  const fetchColumns = async (table) => {
    setSelectedTable(table);
    setColumns([]);
    setSelectedColumns([]);
    setData([]);
    setAdvancedFilters({});
    setJoins([]); // Reset joins when table changes
    try {
      const response = await axios.post('http://localhost:5000/api/columns', {
        host,
        user,
        password,
        database: selectedDatabase,
        table,
      });
      setColumns(response.data);
    } catch (err) {
      setError('Error fetching columns');
    }
  };

  // Handle selection of columns from base table (or joined tables if they are explicitly checked)
  const handleColumnChange = (e, column) => {
    const { checked } = e.target;
    if (checked) {
      setSelectedColumns((prev) => [...prev, column]);
    } else {
      setSelectedColumns((prev) => prev.filter((col) => col !== column));
    }
  };

  // Add new join section
  const addJoin = () => {
    setJoins([
      ...joins,
      {
        joinTable: '',
        joinColumns: [],
        primaryTable: '', // user can choose from base table or any prior joined table
        primaryKey: '',
        foreignKey: '',
        joinType: 'INNER',
      },
    ]);
  };

  // Remove a join section
  const removeJoin = (index) => {
    const newJoins = joins.filter((_, i) => i !== index);
    setJoins(newJoins);
  };

  // Handle join table selection: fetch columns for that join table
  const handleJoinTableSelect = async (index, table) => {
    const newJoins = [...joins];
    newJoins[index].joinTable = table;
    try {
      const response = await axios.post('http://localhost:5000/api/columns', {
        host,
        user,
        password,
        database: selectedDatabase,
        table,
      });
      newJoins[index].joinColumns = response.data;
      setJoins(newJoins);
    } catch (err) {
      setError('Error fetching columns for join table');
    }
  };

  // Update join configuration
  const updateJoin = (index, field, value) => {
    const newJoins = [...joins];
    newJoins[index][field] = value;
    setJoins(newJoins);
  };

  // Compute combined columns from the base table and any joined tables.
  // Each column is represented as an object with name (fully qualified) and label.
  const combinedColumns =
    selectedTable && columns.length > 0
      ? [
          ...columns.map((col) => ({
            name: `${selectedTable}.${col}`,
            label: `${selectedTable}.${col}`,
          })),
          ...joins.flatMap((join) =>
            join.joinColumns.map((col) => ({
              name: `${join.joinTable}.${col}`,
              label: `${join.joinTable}.${col}`,
            }))
          ),
        ]
      : [];

  // Fetch data using the selected columns, advanced filters, and joins
  const fetchData = async () => {
    if (selectedColumns.length === 0) {
      setError('Please select at least one column');
      return;
    }

    try {
      // Build the join objects to send along.
      const formattedJoins = joins.map((j) => ({
        joinTable: j.joinTable,
        primaryTable: j.primaryTable ? j.primaryTable : selectedTable,
        primaryKey: j.primaryKey,
        foreignKey: j.foreignKey,
        joinType: j.joinType,
        joinColumns: j.joinColumns,
      }));

      const payload = {
        host,
        user,
        password,
        database: selectedDatabase,
        table: selectedTable,
        columns: selectedColumns,
        filters: advancedFilters, // nested filters object from AdvancedFilters
        joins: formattedJoins,
      };

      console.log('Query Payload:', payload);

      const response = await axios.post('http://localhost:5000/api/query', payload);

      console.log('API Response:', response.data);

      setData(response.data); // Set the response data for rendering
    } catch (err) {
      setError('Error fetching data');
      console.error(err);
    }
  };

  // Compute the aliases for selected columns.
  // For a column "orders.total", the alias is "orders_total".
  const selectedAliases = selectedColumns.map((col) => {
    if (col.includes('.')) {
      const [tbl, colName] = col.split('.');
      return `${tbl}_${colName}`;
    }
    return `${selectedTable}_${col}`;
  });

  return (
    <div className="App">
      {!isLoggedIn ? (
        <div className="login-form">
          <input
            type="text"
            placeholder="Host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
          />
          <br />
          <input
            type="text"
            placeholder="User"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
          <br />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <br />
          <button onClick={handleLogin}>Log In</button>
        </div>
      ) : (
        <div className="main-content">
          <div className="selection-container">
            <div className="left-section">
              <h2>Select Database</h2>
              <select onChange={(e) => fetchTables(e.target.value)} value={selectedDatabase}>
                <option value="">Select a Database</option>
                {databases.map((db, index) => (
                  <option key={index} value={db}>
                    {db}
                  </option>
                ))}
              </select>

              {selectedDatabase && (
                <div>
                  <h2>Select Table</h2>
                  <select onChange={(e) => fetchColumns(e.target.value)} value={selectedTable}>
                    <option value="">Select a Table</option>
                    {tables.map((table, index) => (
                      <option key={index} value={table}>
                        {table}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedTable && columns.length > 0 && (
                <div>
                  <h2>Select Columns</h2>
                  {columns.map((column, index) => (
                    <div key={index}>
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(`${selectedTable}.${column}`)}
                        onChange={(e) => handleColumnChange(e, `${selectedTable}.${column}`)}
                      />
                      <label>{`${selectedTable}.${column}`}</label>
                    </div>
                  ))}

                  {/* Display join table columns */}
                  {joins.map((join, joinIndex) =>
                    join.joinColumns.map((column, colIndex) => (
                      <div key={`join-${joinIndex}-${colIndex}`}>
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(`${join.joinTable}.${column}`)}
                          onChange={(e) =>
                            handleColumnChange(e, `${join.joinTable}.${column}`)
                          }
                        />
                        <label>{`${join.joinTable}.${column}`}</label>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedColumns.length > 0 && (
                <button className="fetch-button" onClick={fetchData}>
                  Fetch Data
                </button>
              )}
            </div>

            {/* Right section now contains filters and joins */}
            <div className="right-section" style={{ overflowY: 'auto', maxHeight: '80vh' }}>
              <h2>Advanced Filters</h2>
              <AdvancedFilters
                availableColumns={combinedColumns}
                onFiltersUpdate={(filters) => setAdvancedFilters(filters)}
              />

              <div className="join-section">
                <h2>Table Joins</h2>
                <button onClick={addJoin}>Add Join</button>

                {joins.map((join, index) => (
                  <div key={index} className="join-config">
                    <select
                      value={join.joinTable}
                      onChange={(e) => handleJoinTableSelect(index, e.target.value)}
                    >
                      <option value="">Select Join Table</option>
                      {tables
                        .filter((t) => t !== selectedTable)
                        .map((table, idx) => (
                          <option key={idx} value={table}>
                            {table}
                          </option>
                        ))}
                    </select>

                    {/* Primary Table Dropdown for the Join */}
                    <select
                      value={join.primaryTable || selectedTable}
                      onChange={(e) => updateJoin(index, 'primaryTable', e.target.value)}
                    >
                      <option value={selectedTable}>{selectedTable} (base)</option>
                      {joins
                        .filter((j, idx) => idx < index && j.joinTable)
                        .map((j, idx) => (
                          <option key={idx} value={j.joinTable}>
                            {j.joinTable}
                          </option>
                        ))}
                    </select>

                    {join.joinTable && (
                      <>
                        <select
                          value={join.primaryKey}
                          onChange={(e) => updateJoin(index, 'primaryKey', e.target.value)}
                        >
                          <option value="">
                            Select Primary Key ({join.primaryTable || selectedTable})
                          </option>
                          {columns.map((col, idx) => (
                            <option key={idx} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>

                        <select
                          value={join.foreignKey}
                          onChange={(e) => updateJoin(index, 'foreignKey', e.target.value)}
                        >
                          <option value="">
                            Select Foreign Key ({join.joinTable})
                          </option>
                          {join.joinColumns.map((col, idx) => (
                            <option key={idx} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>

                        <select
                          value={join.joinType}
                          onChange={(e) => updateJoin(index, 'joinType', e.target.value)}
                        >
                          <option value="INNER">INNER JOIN</option>
                          <option value="LEFT">LEFT JOIN</option>
                          <option value="RIGHT">RIGHT JOIN</option>
                        </select>

                        <button onClick={() => removeJoin(index)}>Remove</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="data-display">
            {data.length > 0 && selectedColumns.length > 0 && (
              <table>
                <thead>
                  <tr>
                    {selectedAliases.map((alias, index) => (
                      <th key={index}>{alias}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={index}>
                      {selectedAliases.map((alias, idx) => (
                        <td key={idx}>{row[alias]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
      )}
    </div>
  );
}

export default App;
