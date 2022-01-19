const pg = require('pg');
const db = require('./models/clientModelPostgres.js');

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
    await db.connect(this.dbUri);
    //await new pg.Client(this.dbUri);
  }

  /**
   * @function getLatestSessionRecord
   * @params session is the session ID which will be searched in the database, which will find the most recent instance thereof
   */
  async getLatestSessionRecord(session) {
    const text = `SELECT * FROM client WHERE session=$1 ORDER BY _id DESC LIMIT 1;`;
    const values = [session];
    const records = (await db.query(text, values)).rows;
    if (records.length > 0) {
      const { session, state } = records[records.length - 1];
      return { session, state: JSON.parse(state) };
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
    const values = [session, JSON.stringify(state)];
    await db.query(text, values);
    return { session, state };
  }

  /**
   * @function deleteLatestSessionRecord
   * @param session
   */
  async deleteLatestSessionRecord(session) {
    const text = `SELECT * FROM client WHERE session=$1;`;
    const value = [session];
    const records = (await db.query(text, value)).rows;
    if (records.length > 1) {
      const { id } = records[records.length - 1];
      const text2 = `DELETE FROM client WHERE _id=(SELECT MAX(_id) FROM client WHERE session=$1);`;
      const value2 = [session];
      await db.query(text2, value2);
    }
  }

  /**
   * @function clearAllStates
   */
  async clearAllStates() {
    const text = `DELETE FROM client`;
    await db.query(text);
  }

  /**
   * @function close
   */
  async close() {
    await db.close();
  }

  /**
   * @property {function} __getDB getDB is a method to return the entire DB ()
   */
  __getDB() {
    return db;
  }
}

module.exports = PostgresDriver;
