const express = require('express');
const next = require('next');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const db = require('./server/database');
const serverManager = require('./server/ServerManager');
const auth = require('./server/auth');
const metrics = require('./server/metrics');
const players = require('./server/players');
const backups = require('./server/backups');
const configEditor = require('./server/configEditor');
const tunnel = require('./server/tunnel');
const autoScanner = require('./server/autoScanner');
const wallpaperFetcher = require('./server/wallpaperFetcher');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;
const upload = multer({ dest: '/tmp/' });

app.prepare().then(() => {
  const server = express();
  server.use(express.json());
  server.use(cookieParser());
  server.use(express.static(path.join(__dirname, 'public')));

  const httpServer = createServer(server);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  // Start real-time metrics broadcaster (CPU/RAM per container)
  metrics.startMetricsBroadcaster(io);

  // Socket.io for Real-Time Console and Status
  io.on('connection', (socket) => {
    const servers = db.getServers();
    servers.forEach(s => {
       if (serverManager.logProcesses && serverManager.logProcesses.has(s.id)) {
           socket.emit('status', { id: s.id, status: s.status });
       }
    });
  });

  // Connect serverManager events to socket.io
  serverManager.on('console', (data) => {
    io.emit('console', data);
  });
  
  serverManager.on('status', (data) => {
    io.emit('status', data);
  });

  // ---------------- AUTH ROUTES ----------------
  server.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    if (auth.verifyPassword(password)) {
      const token = auth.generateToken();
      res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
      return res.json({ success: true, token });
    }
    return res.status(401).json({ error: 'Incorrect password' });
  });

  server.get('/api/auth/check', (req, res) => {
    const token = req.cookies?.token;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        jwt.verify(token, process.env.JWT_SECRET || 'minecraft-dashboard-secret-key-2026');
        return res.json({ authenticated: true, isDefault: auth.isDefaultPassword() });
      } catch (e) {}
    }
    return res.json({ authenticated: false, isDefault: false });
  });

  server.post('/api/auth/change-password', (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    auth.changePassword(newPassword);
    res.json({ success: true });
  });

  server.get('/api/wallpapers/minecraft', async (req, res) => {
    try {
      const wallpapers = await wallpaperFetcher.getMinecraftWallpapers();
      res.json(wallpapers);
    } catch (e) {
      res.json(["/minecraft_bg.png", "/minecraft_bg_2.png", "/minecraft_bg_3.png"]);
    }
  });

  server.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  // Apply Auth Middleware to all subsequent routes
  server.use(auth.authMiddleware);

  // Auto-scan Servers directory for existing servers on boot
  autoScanner.scanAndImportServers();

  // ---------------- SERVER MANAGMENT API ----------------
  server.get('/api/servers', (req, res) => {
    res.json(db.getServers());
  });

  server.post('/api/servers/scan', (req, res) => {
    try {
      const count = autoScanner.scanAndImportServers();
      res.json({ success: true, count, servers: db.getServers() });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.get('/api/servers/:id', (req, res) => {
    const srv = db.getServer(req.params.id);
    if (!srv) return res.status(404).json({ error: 'Not found' });
    res.json(srv);
  });

  server.post('/api/servers', (req, res) => {
    const { name, type, version, path, port } = req.body;
    try {
      const id = db.addServer({ name, type, version, path, port });
      res.json({ id, success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/servers/:id/start', async (req, res) => {
    try {
      await serverManager.start(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/servers/:id/stop', (req, res) => {
    try {
      serverManager.stop(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  server.post('/api/servers/:id/kill', (req, res) => {
    try {
      serverManager.kill(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/servers/:id/command', (req, res) => {
    try {
      serverManager.sendCommand(parseInt(req.params.id), req.body.command);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.get('/api/versions/java', async (req, res) => {
    try {
      const response = await fetch('https://fill.papermc.io/v3/projects/paper', { headers: { 'User-Agent': 'mc-dashboard/1.0.0 (contact@example.com)' } });
      const data = await response.json();
      let allVersions = [];
      for (const major in data.versions) {
        allVersions = allVersions.concat(data.versions[major]);
      }
      res.json(allVersions.reverse());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/install', async (req, res) => {
    const { name, type, engine, modpackUrl, version, port } = req.body;
    try {
      const serverPath = path.join(__dirname, '..', 'Servers', name.replace(/\s+/g, '_'));
      if (!fs.existsSync(serverPath)) {
        fs.mkdirSync(serverPath, { recursive: true });
      }

      const id = db.addServer({ name, type, engine, modpackUrl, version, path: serverPath, port });
      res.json({ id, success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------- FILE MANAGER API ----------------
  server.get('/api/servers/:id/files', (req, res) => {
    try {
      const serverData = db.getServer(req.params.id);
      if (!serverData) return res.status(404).json({ error: 'Server not found' });
      const dirPath = req.query.path ? path.join(serverData.path, req.query.path) : serverData.path;
      if (!fs.existsSync(dirPath)) return res.json([]);
      
      const items = fs.readdirSync(dirPath, { withFileTypes: true }).map(dirent => ({
        name: dirent.name,
        isDirectory: dirent.isDirectory(),
        size: dirent.isDirectory() ? 0 : fs.statSync(path.join(dirPath, dirent.name)).size
      }));
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/servers/:id/files/upload', upload.single('file'), (req, res) => {
    try {
      const serverData = db.getServer(req.params.id);
      if (!serverData) return res.status(404).json({ error: 'Server not found' });
      const targetDir = path.join(serverData.path, req.body.path || '');
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      fs.renameSync(req.file.path, path.join(targetDir, req.file.originalname));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/servers/:id/files/delete', (req, res) => {
    try {
      const serverData = db.getServer(req.params.id);
      if (!serverData) return res.status(404).json({ error: 'Server not found' });
      const targetPath = path.join(serverData.path, req.body.filePath);
      if (fs.existsSync(targetPath)) {
        if (fs.lstatSync(targetPath).isDirectory()) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(targetPath);
        }
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/servers/:id/files/rename', (req, res) => {
    try {
      const serverData = db.getServer(req.params.id);
      if (!serverData) return res.status(404).json({ error: 'Server not found' });
      const oldPath = path.join(serverData.path, req.body.oldPath);
      const newPath = path.join(serverData.path, req.body.newPath);
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------- PLAYERS API ----------------
  server.get('/api/servers/:id/players', async (req, res) => {
    try {
      const data = await players.getPlayers(parseInt(req.params.id));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/servers/:id/players/action', (req, res) => {
    const { action, playerName } = req.body;
    const id = parseInt(req.params.id);
    try {
      if (action === 'kick') players.kickPlayer(id, playerName);
      else if (action === 'ban') players.banPlayer(id, playerName);
      else if (action === 'op') players.opPlayer(id, playerName);
      else if (action === 'deop') players.deopPlayer(id, playerName);
      else return res.status(400).json({ error: 'Invalid action' });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------- BACKUPS API ----------------
  server.get('/api/servers/:id/backups', (req, res) => {
    try {
      res.json(backups.listBackups(parseInt(req.params.id)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/servers/:id/backups/create', async (req, res) => {
    try {
      const result = await backups.createBackup(parseInt(req.params.id));
      res.json({ success: true, ...result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/servers/:id/backups/delete', (req, res) => {
    try {
      backups.deleteBackup(parseInt(req.params.id), req.body.fileName);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------- CONFIG EDITOR API ----------------
  server.get('/api/servers/:id/config/properties', (req, res) => {
    try {
      res.json(configEditor.getServerProperties(parseInt(req.params.id)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/servers/:id/config/properties', (req, res) => {
    try {
      configEditor.updateServerProperties(parseInt(req.params.id), req.body.properties);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---------------- REMOTE TUNNEL API ----------------
  server.get('/api/tunnel/status', (req, res) => {
    try {
      res.json(tunnel.getTunnelStatus());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/tunnel/start', (req, res) => {
    try {
      res.json(tunnel.startTunnel());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  server.post('/api/tunnel/stop', (req, res) => {
    try {
      res.json(tunnel.stopTunnel());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Let Next.js handle all other requests
  server.use((req, res) => {
    return handle(req, res);
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Dashboard ready on http://localhost:${port}`);
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});
