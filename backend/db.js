const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'warehouse.db');
const migrationsPath = path.join(__dirname, 'migrations.sql');

const db = new sqlite3.Database(dbPath);

const initDb = () => {
  const migrations = fs.readFileSync(migrationsPath, 'utf-8');
  db.exec(migrations, (err) => {
    if (err) console.error('Error running migrations:', err);
    else console.log('Database initialized ✅');
  });
};

module.exports = { db, initDb };
