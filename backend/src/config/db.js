const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: 10, // max connections in pool (low — single user)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log connection events in development
pool.on('connect', () => {
  if (config.env === 'development') {
    console.log('📦 New client connected to PostgreSQL');
  }
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

module.exports = pool;
