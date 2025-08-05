const { PaginationHelper } = require('./src/utils/pagination');
const { pooledQuery } = require('./src/config/database');
const DatabaseMigrator = require('./src/config/migrations');
const DatabaseBackup = require('./src/utils/database-backup');
const { JobManager, JobTracker } = require('./src/jobs/processors');

async function testInfrastructure() {
  console.log('🔧 Testing Infrastructure Components...\n');

  try {
    // Test 1: Database Migrations
    console.log('1. Testing Database Migrations...');
    const migrator = new DatabaseMigrator();
    await migrator.migrate();
    console.log('✅ Database migrations completed\n');

    // Test 2: Connection Pooling
    console.log('2. Testing Database Connection Pooling...');
    const testQuery = 'SELECT COUNT(*) as count FROM users';
    const result = await pooledQuery.get(testQuery);
    console.log(`✅ Pooled query executed successfully: ${result.count} users\n`);

    // Test 3: Pagination
    console.log('3. Testing Pagination Helper...');
    const paginationParams = {
      page: 1,
      limit: 5,
      sort: 'created_at',
      order: 'desc'
    };
    
    try {
      const validated = PaginationHelper.validateParams(paginationParams);
      console.log('✅ Pagination parameters validated:', validated);
    } catch (error) {
      console.log('❌ Pagination validation failed:', error.message);
    }
    console.log();

    // Test 4: Database Backup
    console.log('4. Testing Database Backup System...');
    const backup = new DatabaseBackup();
    const backupPath = await backup.backup('test-backup.sql');
    console.log(`✅ Database backup created: ${backupPath}`);
    
    const backups = await backup.listBackups();
    console.log(`✅ Found ${backups.length} backup(s)\n`);

    // Test 5: Job Queue (Redis needs to be running)
    console.log('5. Testing Job Queue System...');
    try {
      const jobId = await JobManager.addNewsScrapingJob('test-source', 1);
      console.log(`✅ News scraping job created with ID: ${jobId}`);
      
      // Wait a moment and check status
      setTimeout(async () => {
        try {
          const status = await JobTracker.getJobStatus(jobId, 'news');
          console.log(`✅ Job status retrieved:`, status.status);
        } catch (error) {
          console.log('⚠️  Job status check failed (Redis may not be running):', error.message);
        }
      }, 1000);
    } catch (error) {
      console.log('⚠️  Job queue test failed (Redis may not be running):', error.message);
    }
    console.log();

    console.log('🎉 Infrastructure testing completed!');
    console.log('\nTo fully test the system:');
    console.log('1. Start Redis: `redis-server`');
    console.log('2. Start the server: `npm start`');
    console.log('3. Visit: http://localhost:3000/api-docs');
    console.log('4. Check health: http://localhost:3000/health');

  } catch (error) {
    console.error('❌ Infrastructure test failed:', error);
  }
}

// Run tests if called directly
if (require.main === module) {
  testInfrastructure();
}

module.exports = { testInfrastructure };
