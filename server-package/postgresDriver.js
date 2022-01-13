const { Pool } = require('pg');
const db = require('./models/clientModelSQL.js');

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
    await new Pool({ connectionString: this.dbUri });
  }

  /**
   * @function getLatestSessionRecord
   * @params session is the session ID which will be searched in the database, which will find the most recent instance thereof
   */
  async getLatestSessionRecord(session) {
    const records = await db.find({ session });
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
    ({ session, state } = await db.create({ session, state }));
    return { session, state };
  }

  /**
   * @function deleteLatestSessionRecord
   * @param session
   */
  async deleteLatestSessionRecord(session) {
    const records = await db.find({ session });
    if (records.length > 1) {
      const { id } = records[records.length - 1];
      await db.findByIdAndDelete(id);
    }
  }

  /**
   * @function clearAllStates
   */
  async clearAllStates() {
    const sessionRecords = await db.find();
    if (sessionRecords.length) {
      await db.collection.drop();
    }
  }

  /**
   * @function close
   */
  close() {
    mongoose.connection.close();
  }

  /**
   * @property {function} __getDB getDB is a method to return the entire DB ()
   */
  __getDB() {
    return db;
  }
}

module.exports = PostgresDriver;
