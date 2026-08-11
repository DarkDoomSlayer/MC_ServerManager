const { spawn, execSync } = require('child_process');
const EventEmitter = require('events');
const db = require('./database');

class ServerManager extends EventEmitter {
  constructor() {
    super();
    this.logProcesses = new Map(); // id -> docker logs process
    this.reconcileStatuses();
  }

  reconcileStatuses() {
    try {
      const servers = db.getServers();
      for (const s of servers) {
        const containerName = `mc-server-${s.id}`;
        try {
          const inspect = execSync(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`).toString().trim();
          if (inspect === 'true') {
            db.updateServerStatus(s.id, 'online');
          } else {
            db.updateServerStatus(s.id, 'offline');
          }
        } catch (e) {
          db.updateServerStatus(s.id, 'offline');
        }
      }
    } catch (e) {
      console.error("Failed to reconcile server statuses:", e.message);
    }
  }

  async start(id) {
    if (this.logProcesses.has(id)) {
      throw new Error('Server logs are already attached');
    }

    const serverData = db.getServer(id);
    if (!serverData) throw new Error('Server not found');

    const containerName = `mc-server-${id}`;

    // Check if container already exists and is running
    try {
      const inspect = execSync(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`).toString().trim();
      if (inspect !== 'true') {
        // Exists but stopped, start it
        execSync(`docker start ${containerName}`);
      }
    } catch (e) {
      // Container does not exist, run it
      const cwd = serverData.path;
      let dockerCmd = ['run', '-d', '--name', containerName, '-v', `${cwd}:/data`];
      
      if (serverData.type === 'java') {
        dockerCmd.push('-p', `${serverData.port}:${serverData.port}`);
        dockerCmd.push('-p', `${serverData.mapPort || 8123}:8123`);
        dockerCmd.push('-e', `SERVER_PORT=${serverData.port}`);
        dockerCmd.push('-e', 'EULA=TRUE');
        
        const engine = serverData.engine || 'PAPER';
        dockerCmd.push('-e', `TYPE=${engine}`);
        
        if (engine === 'AUTO_CURSEFORGE' && serverData.modpackUrl) {
          dockerCmd.push('-e', `CF_SERVER_MOD=${serverData.modpackUrl}`);
        }

        if (serverData.version && serverData.version.toLowerCase() !== 'unknown') {
          dockerCmd.push('-e', `VERSION=${serverData.version}`);
        }
        dockerCmd.push('itzg/minecraft-server');
      } else if (serverData.type === 'bedrock') {
        dockerCmd.push('-p', `${serverData.port}:${serverData.port}/udp`);
        dockerCmd.push('-e', 'EULA=TRUE');
        if (serverData.version && serverData.version.toLowerCase() !== 'unknown') {
          dockerCmd.push('-e', `VERSION=${serverData.version}`);
        }
        dockerCmd.push('itzg/minecraft-bedrock-server');
      } else {
        throw new Error('Unknown server type');
      }
      
      console.log('Spawning container:', 'docker ' + dockerCmd.join(' '));
      execSync('docker ' + dockerCmd.join(' '));
    }

    db.updateServerStatus(id, 'starting');
    this.emit('status', { id, status: 'starting' });

    // Attach to logs
    const logProcess = spawn('docker', ['logs', '-f', containerName]);
    this.logProcesses.set(id, logProcess);

    logProcess.stdout.on('data', (data) => {
      this.emit('console', { id, data: data.toString() });
      
      const out = data.toString();
      if (out.includes('Done (') || out.includes('Server started.') || out.includes('IPv4 supported')) {
        db.updateServerStatus(id, 'online');
        this.emit('status', { id, status: 'online' });
      }
    });

    logProcess.stderr.on('data', (data) => {
      this.emit('console', { id, data: data.toString(), error: true });
    });

    logProcess.on('close', (code) => {
      this.logProcesses.delete(id);
      db.updateServerStatus(id, 'offline');
      this.emit('status', { id, status: 'offline' });
      this.emit('console', { id, data: `\n[Dashboard] Log stream disconnected (code ${code})\n` });
    });

    return true;
  }

  stop(id) {
    const containerName = `mc-server-${id}`;
    try {
      execSync(`docker stop ${containerName}`);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  kill(id) {
    const containerName = `mc-server-${id}`;
    try {
      execSync(`docker kill ${containerName}`);
      return true;
    } catch (e) {
      return false;
    }
  }

  sendCommand(id, command) {
    const serverData = db.getServer(id);
    if (!serverData) return false;
    
    const containerName = `mc-server-${id}`;
    try {
      if (serverData.type === 'java') {
         // itzg/minecraft-server has rcon-cli builtin
         execSync(`docker exec -i ${containerName} rcon-cli ${command}`);
      } else {
         // For bedrock itzg image, we can send to stdin
         // But docker exec doesn't always attach to the bedrock process stdin.
         // Actually, bedrock-server image has 'q' as an alias for commands or we can use send-command
         // but let's try docker attach or just `docker exec -i ${containerName} mc-send-to-console ${command}` if available.
         execSync(`docker exec -i ${containerName} mc-send-to-console ${command}`);
      }
      return true;
    } catch (e) {
      console.error("Failed to send command:", e.message);
      return false;
    }
  }
}

module.exports = new ServerManager();
