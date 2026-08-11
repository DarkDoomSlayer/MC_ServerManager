const fs = require('fs');
const path = require('path');
const db = require('./database');

function scanAndImportServers() {
  const rootServersDir = path.join(__dirname, '..', 'Servers');
  const parentServersDir = path.join(__dirname, '..', '..', 'Servers');
  
  const searchDirs = [rootServersDir, parentServersDir];
  const importedCount = { count: 0 };

  searchDirs.forEach(baseDir => {
    if (!fs.existsSync(baseDir)) return;

    try {
      const items = fs.readdirSync(baseDir, { withFileTypes: true });
      const registered = db.getServers();
      const registeredPaths = new Set(registered.map(s => path.normalize(s.path)));

      items.forEach(item => {
        if (!item.isDirectory()) return;

        const serverFolder = path.join(baseDir, item.name);
        const normalizedFolder = path.normalize(serverFolder);

        // Skip if already in database
        if (registeredPaths.has(normalizedFolder)) return;

        // Auto-detect server properties
        let port = 25565;
        let type = 'java';
        let engine = 'PAPER';
        let version = '1.20.4';

        const propsPath = path.join(serverFolder, 'server.properties');
        if (fs.existsSync(propsPath)) {
          const content = fs.readFileSync(propsPath, 'utf8');
          const portMatch = content.match(/^server-port=(.*)$/m);
          if (portMatch && portMatch[1]) {
            const parsedPort = parseInt(portMatch[1].trim());
            if (!isNaN(parsedPort)) port = parsedPort;
          }
        }

        // Check if Bedrock
        const isBedrock = fs.existsSync(path.join(serverFolder, 'bedrock_server')) ||
                          fs.existsSync(path.join(serverFolder, 'bedrock_server.exe')) ||
                          item.name.toLowerCase().includes('bedrock');

        if (isBedrock) {
          type = 'bedrock';
          if (port === 25565) port = 19132;
        } else {
          // Detect engine
          if (fs.existsSync(path.join(serverFolder, 'mods'))) {
            engine = 'FORGE';
          } else if (fs.existsSync(path.join(serverFolder, 'plugins'))) {
            engine = 'PAPER';
          } else {
            engine = 'VANILLA';
          }
        }

        const name = item.name.replace(/_/g, ' ');

        db.addServer({
          name,
          type,
          engine,
          version,
          path: normalizedFolder,
          port,
          mapPort: 8123
        });

        registeredPaths.add(normalizedFolder);
        importedCount.count++;
      });
    } catch (e) {
      console.error("Auto-scan error:", e.message);
    }
  });

  return importedCount.count;
}

module.exports = { scanAndImportServers };
