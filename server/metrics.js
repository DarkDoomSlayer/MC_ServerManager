const { exec } = require('child_process');

function startMetricsBroadcaster(io, intervalMs = 3000) {
  setInterval(() => {
    // Run docker stats in non-streaming mode
    exec('docker stats --no-stream --format "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}"', (err, stdout) => {
      if (err || !stdout) return;

      const lines = stdout.trim().split('\n');
      const statsMap = {};

      lines.forEach(line => {
        const parts = line.split('|');
        if (parts.length >= 4) {
          const containerName = parts[0].trim();
          // Extract server ID if container matches mc-server-<id>
          if (containerName.startsWith('mc-server-')) {
            const id = containerName.replace('mc-server-', '');
            statsMap[id] = {
              cpu: parts[1].trim(),
              memUsage: parts[2].trim(),
              memPerc: parts[3].trim()
            };
          }
        }
      });

      io.emit('metrics', statsMap);
    });
  }, intervalMs);
}

module.exports = { startMetricsBroadcaster };
