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
        password
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
    try {
      const response = await axios.post('http://localhost:5000/api/tables', {
        host,
        user,
        password,
        database
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
    try {
      const response = await axios.post('http://localhost:5000/api/columns', {
        host,
        user,
        password,
        database: selectedDatabase,
        table
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

  // Fetch data using the selected columns and advanced filters
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
        filters: advancedFilters
      });
      setData(response.data);
    } catch (err) {
      setError('Error fetching data');
    }
  };

  return (
    <div className="App">
      <h1>MySQL Data Fetcher</h1>
      {!isLoggedIn ? (
        <div className="login-form">
          <input type="text" placeholder="Host" value={host} onChange={(e) => setHost(e.target.value)} />
          <input type="text" placeholder="User" value={user} onChange={(e) => setUser(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
                  <option key={index} value={db}>{db}</option>
                ))}
              </select>
              {selectedDatabase && (
                <div>
                  <h2>Select Table</h2>
                  <select onChange={(e) => fetchColumns(e.target.value)} value={selectedTable}>
                    <option value="">Select a Table</option>
                    {tables.map((table, index) => (
                      <option key={index} value={table}>{table}</option>
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
                        value={column} 
                        onChange={(e) => handleColumnChange(e, column)} 
                      />
                      <label>{column}</label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="right-section">
              {selectedTable && columns.length > 0 && (
                <>
                  <h2>Advanced Filters</h2>
                  <AdvancedFilters 
                    availableColumns={columns} 
                    onFiltersUpdate={(filters) => setAdvancedFilters(filters)} 
                  />
                  <button onClick={fetchData}>Fetch Data</button>
                </>
              )}
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