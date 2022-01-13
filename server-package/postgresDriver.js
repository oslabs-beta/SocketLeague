const pg = require('pg');
// const { pool } = require('pg');
//const db = require('./models/clientModelPostgres.js');
let db;

/**
 * @class PostgresDriver
 */
class PostgresDriver {
  /**
   * @param {string} uri The uri is used to connect to the users DB
   */
  constructor(uri) {
    this.dbUri = uri;
  }
  async connect() {
    //await new Pool({ connectionString: this.dbUri });
    console.log('connect function called');
    //await new pg.Client(this.dbUri);
    db = await new pg.Client(this.dbUri);
  }

  /**
   * @function getLatestSessionRecord
   * @params session is the session ID which will be searched in the database, which will find the most recent instance thereof
   */
  async getLatestSessionRecord(session) {
    // const records = await db.find({ session });
    const text = `SELECT * FROM client WHERE session=$1;`;
    const values = [session];
    const records = await db.query(text, values);
    // console.log('The records in postresDriver are', records);
    if (records.length > 0) {
      const { session, state } = records[records.length - 1];
      return { session, state };
    }
    return null;
  }

  /**
   * @function createSessionRecord
   * @param session
   * @param state
   */
  async createSessionRecord(session, state) {
    const text = `INSERT INTO client (session, state) VALUES($1, $2);`;
    const values = [session, state];
    ({ session, state } = await db.query(text, values));
    return { session, state };
  }

  /**
   * @function deleteLatestSessionRecord
   * @param session
   */
  async deleteLatestSessionRecord(session) {
    const text = `SELECT * FROM client WHERE session=$1;`;
    const value = [session];
    const records = await db.query(text, value);
    if (records.length > 1) {
      const { id } = records[records.length - 1];
      const text2 = `DELETE FROM client WHERE _id=$1;`;
      const value2 = [id];
      await db.query(text2, value2);
    }
  }

  /**
   * @function clearAllStates
   */
  async clearAllStates() {
    const text = `DELETE * FROM client`;
    await db.query(text);
  }

  /**
   * @function close
   */
  close() {
    // need to test and verify if this is correct. It looks wrong
    const text = `SELECT pg_terminate_backend(pid) FROM pg_stat_get_activity(NULL::integer)
                  WHERE datid = (SELECT oid FROM pg_database WHERE datname = 'database_name');`;
    db.query(text);
  }

  /**
   * @property {function} __getDB getDB is a method to return the entire DB ()
   */
  __getDB() {
    return db;
  }
}

module.exports = PostgresDriver;
