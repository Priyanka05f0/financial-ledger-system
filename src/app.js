const express = require('express');
const pool = require('./db');
const accountRoutes = require('./routes/accountRoutes');

const app = express();

app.use(express.json());
app.use(accountRoutes);

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send('DB Connected. Time: ' + result.rows[0].now);
  } catch (err) {
    res.status(500).send('Database connection failed');
  }
});

module.exports = app;