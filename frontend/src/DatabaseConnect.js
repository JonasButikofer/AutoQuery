import React, { useState } from 'react';
import axios from 'axios';

const DatabaseConnect = () => {
  const [host, setHost] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');
  const [responseMessage, setResponseMessage] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    axios.post('http://localhost:5000/api/connect', {
      host: host,
      user: user,
      password: password,
      database: database
    })
    .then(response => {
      setResponseMessage(response.data.message);
    })
    .catch(error => {
      setResponseMessage('Error: ' + error.response.data.error);
    });
  };

  return (
    <div>
      <h1>Connect to MySQL Database</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Host:</label>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Username:</label>
          <input
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Database Name:</label>
          <input
            type="text"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            required
          />
        </div>
        <button type="submit">Connect</button>
      </form>

      {responseMessage && <p>{responseMessage}</p>}
    </div>
  );
};

export default DatabaseConnect;
