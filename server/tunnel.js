const { execSync, exec } = require('child_process');

function getTunnelStatus() {
  try {
    const running = execSync("docker inspect -f '{{.State.Running}}' playit-agent 2>/dev/null").toString().trim();
    if (running === 'true') {
      const logs = execSync("docker logs --tail 20 playit-agent 2>/dev/null").toString();
      // Extract secret claim URL if present in logs
      const claimMatch = logs.match(/https:\/\/playit\.gg\/claim\/[a-zA-Z0-9-]+/);
      return {
        status: 'running',
        claimUrl: claimMatch ? claimMatch[0] : null,
        logs: logs
      };
    }
  } catch (e) {}
  return { status: 'stopped', claimUrl: null, logs: '' };
}

function startTunnel() {
  try {
    const status = getTunnelStatus();
    if (status.status === 'running') return status;

    // Run playit agent in docker with host network mode so it routes to all local minecraft ports
    execSync("docker run -d --name playit-agent --net=host ghcr.io/playit-cloud/playit-agent:latest");
    return getTunnelStatus();
  } catch (e) {
    throw new Error('Failed to start playit tunnel: ' + e.message);
  }
}

function stopTunnel() {
  try {
    execSync("docker stop playit-agent && docker rm playit-agent 2>/dev/null");
    return { status: 'stopped' };
  } catch (e) {
    return { status: 'stopped' };
  }
}

module.exports = {
  getTunnelStatus,
  startTunnel,
  stopTunnel
};
