const path = require('path');
const fs = require('fs');

module.exports = async () => {
  // Clean up test database after all tests
  const testDbPath = path.join(__dirname, '../linkedin_distributor_test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  // Close any open database connections
  const { database } = require('../src/config/database');
  if (database && database.close) {
    database.close();
  }
};
