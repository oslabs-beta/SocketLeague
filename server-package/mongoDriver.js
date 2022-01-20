/**
 * @file mongoDriver.js handles all mongoDB functionality
 */
const mongoose = require('mongoose');
const db = require('./models/clientModel.js');

/**
 * @class MongoDriver handles all functionality related to connecting to a Mongo Database
 */
class MongoDriver {
  /**
   * @param {string} uri The uri is used to connect to the users DB
   */
  constructor(uri) {
    this.dbUri = uri;
  }

  /**
   * Establish a connection to the DB
   */
  async connect() {
    await mongoose.connect(this.dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  /**
   * Queries the DB for the latest record
   * @param {String} session The session ID which will be searched in the database
   * @return {Object} An object containing the session ID and the new state or Null
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
   * Creates a new DB record from the session
   * @param {String} session The session ID which will be searched in the database
   * @param {Object} state Object passed in by the client that will be sotred in the DB as the state
   * @return {Object}) An object containing the session ID and the new state
   */
  async createSessionRecord(session, state) {
    ({ session, state } = await db.create({ session, state }));
    return { session, state };
  }

  /**
   * Delete the last record from the DB
   * @param {String} session
   */
  async deleteLatestSessionRecord(session) {
    const records = await db.find({ session });
    if (records.length > 1) {
      const { id } = records[records.length - 1];
      await db.findByIdAndDelete(id);
    }
  }

  /**
   * Clear the mongo DB collection
   */
  async clearAllStates() {
    const sessionRecords = await db.find();
    if (sessionRecords.length) {
      await db.collection.drop();
    }
  }

  /**
   * close connection to mongoDB
   */
  async close() {
    await mongoose.connection.close();
  }

  /**
   * getDB is a method to return the entire DB ()
   * @return {Object}) returns the stored database wrapped by the Driver
   */
  __getDB() {
    return db;
  }
}

module.exports = MongoDriver;
