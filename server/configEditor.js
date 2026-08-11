const fs = require('fs');
const path = require('path');
const db = require('./database');

function getServerProperties(serverId) {
  const server = db.getServer(serverId);
  if (!server) throw new Error('Server not found');

  const propsPath = path.join(server.path, 'server.properties');
  if (!fs.existsSync(propsPath)) return {};

  const content = fs.readFileSync(propsPath, 'utf8');
  const properties = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const parts = line.split('=');
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      properties[key] = value;
    }
  });

  return properties;
}

function updateServerProperties(serverId, newProperties) {
  const server = db.getServer(serverId);
  if (!server) throw new Error('Server not found');

  const propsPath = path.join(server.path, 'server.properties');
  let lines = [];

  if (fs.existsSync(propsPath)) {
    const content = fs.readFileSync(propsPath, 'utf8');
    lines = content.split('\n');
  }

  const updatedKeys = new Set();
  const newLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const key = trimmed.split('=')[0].trim();
      if (newProperties[key] !== undefined) {
        updatedKeys.add(key);
        return `${key}=${newProperties[key]}`;
      }
    }
    return line;
  });

  // Append any missing keys
  Object.keys(newProperties).forEach(key => {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${newProperties[key]}`);
    }
  });

  fs.writeFileSync(propsPath, newLines.join('\n'));
  return true;
}

function getRawFileContent(serverId, relativePath) {
  const server = db.getServer(serverId);
  if (!server) throw new Error('Server not found');

  const filePath = path.join(server.path, relativePath);
  if (!fs.existsSync(filePath)) throw new Error('File not found');

  return fs.readFileSync(filePath, 'utf8');
}

function saveRawFileContent(serverId, relativePath, content) {
  const server = db.getServer(serverId);
  if (!server) throw new Error('Server not found');

  const filePath = path.join(server.path, relativePath);
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

module.exports = {
  getServerProperties,
  updateServerProperties,
  getRawFileContent,
  saveRawFileContent
};
