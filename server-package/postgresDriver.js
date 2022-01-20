/**
 * @file postgresDriver.js handles all postgresDB functionality
 */

const pg = require('pg');
const db = require('./models/clientModelPostgres.js');

/**
 * @class PostgresDriver handles all functionality related to connecting to a Postgres Database
 */
class PostgresDriver {
  /**
   * @param {string} uri The uri is used to connect to the users DB
   */
  constructor(uri) {
    this.dbUri = uri;
  }

  /**
   * Establishes a connection to the database
   */
  async connect() {
    await db.connect(this.dbUri);
  }

  /**
   * Queries the database for the most recent session record
   * @param {String} session The session ID which will be searched in the database
   * @return {Object} An object containing the session ID and the new state or Null
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
   * Creates a new session record in the database
   * @param {String} session The session ID which will be searched in the database
   * @param {Object} state the state object that was provided by the client
   * @return {Object} An object containing the session ID and the new state
   */
  async createSessionRecord(session, state) {
    const text = `INSERT INTO client (session, state) VALUES($1, $2);`;
    const values = [session, JSON.stringify(state)];
    await db.query(text, values);
    return { session, state };
  }

  /**
   * Removes the most recent state change in the database
   * @param {String} session The session ID which will be searched in the database
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
   * Clear all records from the postgreSQL DB
   */
  async clearAllStates() {
    const text = `DELETE FROM client`;
    await db.query(text);
  }

  /**
   * Close the connection to the DB
   */
  async close() {
    await db.close();
  }

  /**
   * Returns the entire DB. Used for testing
   * @return {Object} returns the stored database wrapped by the Driver
   */
  __getDB() {
    return db;
  }
}

module.exports = PostgresDriver;
