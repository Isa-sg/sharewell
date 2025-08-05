const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async backup(filename) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = filename || `backup-${timestamp}.sql`;
    const backupPath = path.join(this.backupDir, backupFile);

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(backupPath);
      
      db.serialize(() => {
        // Get all table names
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
          if (err) {
            reject(err);
            return;
          }

          let completed = 0;
          const totalTables = tables.length;

          if (totalTables === 0) {
            writeStream.end();
            resolve(backupPath);
            return;
          }

          tables.forEach(table => {
            const tableName = table.name;
            
            // Get table schema
            db.get(`SELECT sql FROM sqlite_master WHERE name='${tableName}'`, (err, schema) => {
              if (err) {
                reject(err);
                return;
              }

              writeStream.write(`-- Table: ${tableName}\n`);
              writeStream.write(`${schema.sql};\n\n`);

              // Get table data
              db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
                if (err) {
                  reject(err);
                  return;
                }

                if (rows.length > 0) {
                  const columns = Object.keys(rows[0]);
                  const columnNames = columns.join(', ');

                  rows.forEach(row => {
                    const values = columns.map(col => {
                      const value = row[col];
                      if (value === null) return 'NULL';
                      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                      return value;
                    }).join(', ');

                    writeStream.write(`INSERT INTO ${tableName} (${columnNames}) VALUES (${values});\n`);
                  });

                  writeStream.write('\n');
                }

                completed++;
                if (completed === totalTables) {
                  writeStream.end();
                  resolve(backupPath);
                }
              });
            });
          });
        });
      });
    });
  }

  async restore(backupFile) {
    const backupPath = path.isAbsolute(backupFile) 
      ? backupFile 
      : path.join(this.backupDir, backupFile);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    const sql = fs.readFileSync(backupPath, 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim());

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        let completed = 0;
        const totalStatements = statements.length;

        if (totalStatements === 0) {
          db.run('COMMIT');
          resolve();
          return;
        }

        statements.forEach((statement, index) => {
          const cleanStatement = statement.trim();
          if (!cleanStatement) {
            completed++;
            if (completed === totalStatements) {
              db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
              });
            }
            return;
          }

          db.run(cleanStatement, (err) => {
            if (err) {
              db.run('ROLLBACK');
              reject(new Error(`Error executing statement ${index + 1}: ${err.message}`));
              return;
            }

            completed++;
            if (completed === totalStatements) {
              db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
              });
            }
          });
        });
      });
    });
  }

  async listBackups() {
    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const stats = fs.statSync(path.join(this.backupDir, file));
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);

    return files;
  }

  async deleteBackup(filename) {
    const backupPath = path.join(this.backupDir, filename);
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      return true;
    }
    return false;
  }

  async scheduleAutoBackup(intervalHours = 24) {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    setInterval(async () => {
      try {
        const backupPath = await this.backup();
        console.log(`Auto backup created: ${backupPath}`);
        
        // Keep only last 10 backups
        const backups = await this.listBackups();
        if (backups.length > 10) {
          const oldBackups = backups.slice(10);
          for (const backup of oldBackups) {
            await this.deleteBackup(backup.name);
            console.log(`Deleted old backup: ${backup.name}`);
          }
        }
      } catch (error) {
        console.error('Auto backup failed:', error);
      }
    }, intervalMs);

    console.log(`Auto backup scheduled every ${intervalHours} hours`);
  }
}

module.exports = DatabaseBackup;
