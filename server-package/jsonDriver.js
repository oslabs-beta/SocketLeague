
class JsonDriver {

    construcutor() {
       this.db = {};
       
    }

    async connect() {
       
    }
    
    async getLatestSessionRecord(session) {
      const records = this.db[session]
      if (records && records.length > 0) {
        const state = records[records.length - 1];
          return { session, state };
      }
      return null;
    }

    async createSessionRecord(session, state) {
      if (this.db[session]) {
        this.db[session].push(state);
        return { session, state};
      }
      this.db[session] = [state];
      return { session, state };
    }


    async deleteLatestSessionRecord(session) {
      if (this.db[session].length > 1) {
        this.db[session].pop();
      }
               
    }


    async clearAllStates() {
      this.db = {};
    }

    close() { 

    }
}

module.exports = JsonDriver;