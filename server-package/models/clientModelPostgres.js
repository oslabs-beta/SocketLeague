const { Pool } = require('pg');
require('dotenv').config();

let pool;

module.exports = {
  connect: async (uri) => {
    pool = new Pool({ connectionString: uri });
  },
  query: async (text, params, callback) => {
    return await pool.query(text, params, callback);
  },
  close: async () => {
    await pool.end();
  },
};
