const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const db = require('./database');

function getBackupsDir(serverPath) {
  const backupDir = path.join(serverPath, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

function createBackup(serverId) {
  return new Promise((resolve, reject) => {
    const server = db.getServer(serverId);
    if (!server) return reject(new Error('Server not found'));

    const backupDir = getBackupsDir(server.path);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.zip`;
    const filePath = path.join(backupDir, fileName);

    const output = fs.createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve({ fileName, size: archive.pointer() });
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Append files from server folder, excluding backups folder itself
    archive.glob('**/*', {
      cwd: server.path,
      ignore: ['backups/**', 'backups']
    });

    archive.finalize();
  });
}

function listBackups(serverId) {
  const server = db.getServer(serverId);
  if (!server) throw new Error('Server not found');

  const backupDir = getBackupsDir(server.path);
  const files = fs.readdirSync(backupDir);

  return files
    .filter(f => f.endsWith('.zip'))
    .map(f => {
      const stats = fs.statSync(path.join(backupDir, f));
      return {
        name: f,
        size: stats.size,
        createdAt: stats.birthtime
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function deleteBackup(serverId, fileName) {
  const server = db.getServer(serverId);
  if (!server) throw new Error('Server not found');

  const filePath = path.join(getBackupsDir(server.path), fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  createBackup,
  listBackups,
  deleteBackup
};
