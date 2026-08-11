const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'servers.db');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'java' or 'bedrock'
    engine TEXT,
    modpackUrl TEXT,
    version TEXT NOT NULL,
    path TEXT NOT NULL,
    port INTEGER NOT NULL,
    mapPort INTEGER DEFAULT 8123,
    status TEXT DEFAULT 'offline',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = {
  getServers: () => db.prepare('SELECT * FROM servers').all(),
  getServer: (id) => db.prepare('SELECT * FROM servers WHERE id = ?').get(id),
  addServer: (server) => {
    const stmt = db.prepare('INSERT INTO servers (name, type, engine, modpackUrl, version, path, port, mapPort) VALUES (@name, @type, @engine, @modpackUrl, @version, @path, @port, @mapPort)');
    return stmt.run({ mapPort: 8123, ...server }).lastInsertRowid;
  },
  updateServerStatus: (id, status) => {
    const stmt = db.prepare('UPDATE servers SET status = ? WHERE id = ?');
    stmt.run(status, id);
  },
  deleteServer: (id) => {
    const stmt = db.prepare('DELETE FROM servers WHERE id = ?');
    stmt.run(id);
  }
};
