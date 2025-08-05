const fs = require('fs');
const path = require('path');
const { db } = require('./database');

class DatabaseMigrator {
  constructor() {
    this.migrationsDir = path.join(__dirname, '../migrations');
    this.ensureMigrationsTable();
  }

  ensureMigrationsTable() {
    db.run(`CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }

  async getExecutedMigrations() {
    return new Promise((resolve, reject) => {
      db.all('SELECT name FROM migrations ORDER BY executed_at', (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.name));
      });
    });
  }

  async markMigrationExecuted(name) {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO migrations (name) VALUES (?)', [name], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async executeMigration(migrationFile) {
    const migrationPath = path.join(this.migrationsDir, migrationFile);
    const migration = require(migrationPath);
    
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          db.run('BEGIN TRANSACTION');
          await migration.up(db);
          await this.markMigrationExecuted(migrationFile);
          db.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve();
          });
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  async migrate() {
    try {
      if (!fs.existsSync(this.migrationsDir)) {
        fs.mkdirSync(this.migrationsDir, { recursive: true });
      }

      const migrationFiles = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.js'))
        .sort();

      const executedMigrations = await this.getExecutedMigrations();
      const pendingMigrations = migrationFiles.filter(file => 
        !executedMigrations.includes(file)
      );

      console.log(`Found ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        console.log(`Executing migration: ${migration}`);
        await this.executeMigration(migration);
        console.log(`✓ ${migration} completed`);
      }

      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async rollback(migrationName) {
    const migrationPath = path.join(this.migrationsDir, migrationName);
    const migration = require(migrationPath);
    
    if (!migration.down) {
      throw new Error(`Migration ${migrationName} does not have a rollback function`);
    }

    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          db.run('BEGIN TRANSACTION');
          await migration.down(db);
          db.run('DELETE FROM migrations WHERE name = ?', [migrationName]);
          db.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve();
          });
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }
}

module.exports = DatabaseMigrator;
