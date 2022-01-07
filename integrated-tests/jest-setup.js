const startServer = require('./server');

module.exports = async () => {
  global.testServer = await startServer();
};
