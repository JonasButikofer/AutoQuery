const mysql = require("mysql2");

let db; // Store database connection pool

// Connect to the database
exports.connectDB = (req, res) => {
    const { host, user, password, database } = req.body;
    db = mysql.createPool({ host, user, password, database });

    // Test the connection
    db.getConnection((err, connection) => {
        if (err) {
            console.error("Database connection error:", err.message); // Log the error
            return res.status(500).json({ error: err.message });
        }
        connection.release(); // Release the connection back to the pool
        console.log("Connected to the database successfully."); // Log success
        res.json({ message: "Connected successfully" });
    });
};

// Get all tables from the database
exports.getTables = (req, res) => {
    if (!db) {
        console.error("No database connection established."); // Log the error
        return res.status(400).json({ error: "Not connected to a database" });
    }

    db.query("SHOW TABLES", (err, results) => {
        if (err) {
            console.error("Error fetching tables:", err.message); // Log the error
            return res.status(500).json({ error: err.message });
        }
        console.log("Tables fetched successfully."); // Log success
        res.json(results.map(row => Object.values(row)[0]));
    });
};

// Get columns for a specific table
exports.getColumns = (req, res) => {
    if (!db) {
        console.error("No database connection established."); // Log the error
        return res.status(400).json({ error: "Not connected to a database" });
    }

    const { table } = req.params;

    // Validate that the table name is not empty
    if (!table) {
        console.error("No table name provided."); // Log the error
        return res.status(400).json({ error: "Table name is required" });
    }

    // Validate that the table name contains only valid characters
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        console.error("Invalid table name:", table); // Log the error
        return res.status(400).json({ error: "Invalid table name" });
    }

    console.log(`Running query to get columns for table: ${table}`); // Log the query

    db.query(`SHOW COLUMNS FROM \`${table}\``, (err, results) => {
        if (err) {
            console.error("Error fetching columns:", err.message); // Log the error
            return res.status(500).json({ error: err.message });
        }
        console.log(`Columns fetched successfully for table: ${table}`); // Log success
        res.json(results.map(col => col.Field));
    });
};

// Execute a dynamic SQL query
exports.executeQuery = (req, res) => {
    if (!db) {
        console.error("No database connection established."); // Log the error
        return res.status(400).json({ error: "Not connected to a database" });
    }

    const { query } = req.body;

    // Validate that the query is not empty
    if (!query) {
        console.error("No query provided."); // Log the error
        return res.status(400).json({ error: "Query is required" });
    }

    console.log("Executing query:", query); // Log the query

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error executing query:", err.message); // Log the error
            return res.status(500).json({ error: err.message });
        }
        console.log("Query executed successfully."); // Log success
        res.json(results);
    });
};
