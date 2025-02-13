// backend/routes/dbRoutes.js
const express = require("express");
const { connectDB, getTables, getColumns, executeQuery } = require("../controllers/dbController");

const router = express.Router();

// Define routes
router.post("/connect", connectDB);
router.get("/tables", getTables);
router.get("/columns/:table", getColumns);
router.post("/query", executeQuery);

// Export the router
module.exports = router;
