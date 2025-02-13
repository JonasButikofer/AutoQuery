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

  // Advanced filters state
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

  // Handle selection of columns
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

  // Handle join table selection
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

  // Fetch data using the selected columns, advanced filters, and joins
  const fetchData = async () => {
    if (selectedColumns.length === 0) {
      setError('Please select at least one column');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/query', {
        host,
        user,
        password,
        database: selectedDatabase,
        table: selectedTable,
        columns: selectedColumns,
        filters: advancedFilters,
        joins: joins.map((j) => ({
          joinTable: j.joinTable,
          primaryKey: j.primaryKey,
          foreignKey: j.foreignKey,
          joinType: j.joinType,
        })),
      });
      setData(response.data);
    } catch (err) {
      setError('Error fetching data');
    }
  };

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
              <select
                onChange={(e) => fetchTables(e.target.value)}
                value={selectedDatabase}
              >
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
                  <select
                    onChange={(e) => fetchColumns(e.target.value)}
                    value={selectedTable}
                  >
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
                        checked={selectedColumns.includes(column)}
                        onChange={(e) => handleColumnChange(e, column)}
                      />
                      <label>{column}</label>
                    </div>
                  ))}

                  {joins.map((join, joinIndex) =>
                    join.joinColumns.map((column, colIndex) => (
                      <div key={`join-${joinIndex}-${colIndex}`}>
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(
                            `${join.joinTable}.${column}`
                          )}
                          onChange={(e) =>
                            handleColumnChange(e, `${join.joinTable}.${column}`)
                          }
                        />
                        <label>
                          {join.joinTable}.{column}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="right-section">
              <h2>Advanced Filters</h2>
              <AdvancedFilters
                availableColumns={columns}
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

                    {join.joinTable && (
                      <>
                        <select
                          value={join.primaryKey}
                          onChange={(e) =>
                            updateJoin(index, 'primaryKey', e.target.value)
                          }
                        >
                          <option value="">Select Primary Key ({selectedTable})</option>
                          {columns.map((col, idx) => (
                            <option key={idx} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>

                        <select
                          value={join.foreignKey}
                          onChange={(e) =>
                            updateJoin(index, 'foreignKey', e.target.value)
                          }
                        >
                          <option value="">Select Foreign Key ({join.joinTable})</option>
                          {join.joinColumns.map((col, idx) => (
                            <option key={idx} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>

                        <select
                          value={join.joinType}
                          onChange={(e) =>
                            updateJoin(index, 'joinType', e.target.value)
                          }
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

              <button onClick={fetchData}>Fetch Data</button>
            </div>
          </div>

          <div className="data-display">
            {data.length > 0 && (
              <table>
                <thead>
                  <tr>
                    {selectedColumns.map((col, index) => (
                      <th key={index}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={index}>
                      {selectedColumns.map((col, colIndex) => (
                        <td key={colIndex}>{row[col]}</td>
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