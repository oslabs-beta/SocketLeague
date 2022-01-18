const db = require('./models/clientModel.js');

/**
 * @interface Driver
 */
interface Driver {
  /**
   * @function connect
   */
  connect(): Promise<any>;

  /**
   * @function getLatestSessionRecord
   */
  getLatestSessionRecord(session: string): Promise<any>;

  /**
   * @function createSessionRecord
   */
  createSessionRecord(session: string, state: any): Promise<any>;

  /**
   * @function deleteLatestSessionRecord
   */
  deleteLatestSessionRecord(session: string): Promise<any>;

  /**
   * @function clearAllStates
   */
  clearAllStates(): Promise<any>;

  /**
   * @function close
   */
  close(): Promise<any>;
}
