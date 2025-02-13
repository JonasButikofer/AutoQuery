import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // Import your CSS file for styling

function App() {
  // States for login and connection
  const [host, setHost] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');

  // States for databases, tables, and columns
  const [databases, setDatabases] = useState([]);
  const [tables, setTables] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [joins, setJoins] = useState([]); // For join functionality
  const [data, setData] = useState([]);

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

  // Fetch databases from the backend
  const fetchDatabases = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/databases', {
        host,
        user,
        password
      });
      console.log('Databases fetched:', response.data);
      setDatabases(response.data.databases);
    } catch (err) {
      if (err.response) {
        setError(`API Error: ${err.response.data.error}`);
        console.error('Error fetching databases:', err.response.data);
      } else {
        setError('Server is not responding. Please try again later.');
      }
    }
  };

  // Fetch tables of the selected database
  const fetchTables = async (database) => {
    setSelectedDatabase(database);
    setSelectedTable('');
    setColumns([]);
    setSelectedColumns([]);
    setData([]);
    setJoins([]);
    try {
      const response = await axios.post('http://localhost:5000/api/tables', {
        host,
        user,
        password,
        database
      });
      console.log('Tables fetched:', response.data);
      setTables(response.data);
    } catch (err) {
      if (err.response) {
        setError(`API Error: ${err.response.data.error}`);
        console.error('Error fetching tables:', err.response.data);
      } else {
        setError('Server is not responding. Please try again later.');
      }
    }
  };

  // Fetch columns for the selected table
  const fetchColumns = async (table) => {
    setSelectedTable(table);
    setColumns([]);
    setSelectedColumns([]);
    setData([]);
    setJoins([]);
    try {
      const response = await axios.post('http://localhost:5000/api/columns', {
        host,
        user,
        password,
        database: selectedDatabase,
        table
      });
      console.log('Columns fetched:', response.data);
      setColumns(response.data);
    } catch (err) {
      if (err.response) {
        setError(`API Error: ${err.response.data.error}`);
        console.error('Error fetching columns:', err.response.data);
      } else {
        setError('Server is not responding. Please try again later.');
      }
    }
  };

  // Handle column selection for the main table
  const handleColumnChange = (e, column) => {
    const { checked } = e.target;
    if (checked) {
      setSelectedColumns((prev) => [...prev, column]);
    } else {
      setSelectedColumns((prev) => prev.filter((col) => col !== column));
    }
  };

  // Fetch data based on the selected table, columns, and filters (no joins for now)
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
        filters: {} // No filters for now; you can extend this later
      });
      console.log('Data fetched:', response.data);
      if (response.data && response.data.length > 0) {
        setData(response.data);
        setError('');
      } else {
        setError('No data found');
      }
    } catch (err) {
      if (err.response) {
        setError(`API Error: ${err.response.data.error}`);
        console.error('Error fetching data:', err.response.data);
      } else {
        setError('Server is not responding. Please try again later.');
      }
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
                  <h2>Select Columns from Base Table ({selectedTable})</h2>
                  {columns.map((column, index) => (
                    <div key={index}>
                      <input type="checkbox" value={column} onChange={(e) => handleColumnChange(e, column)} />
                      <label>{column}</label>
                    </div>
                  ))}
                  <button onClick={fetchData}>Fetch Data</button>
                </div>
              )}
            </div>
            {/* Right section can be used for join settings if needed */}
            <div className="right-section">
              <h2>Join Tables</h2>
              <button onClick={() => { /* add join logic if needed */ }}>Add Join</button>
            </div>
          </div>
          {/* Data will render in the data box at the bottom */}
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
