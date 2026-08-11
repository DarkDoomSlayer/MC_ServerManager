const Gamedig = require('gamedig');
const db = require('./database');
const serverManager = require('./ServerManager');

async function getPlayers(serverId) {
  const server = db.getServer(serverId);
  if (!server) throw new Error('Server not found');

  try {
    const type = server.type === 'bedrock' ? 'minecraftbedrock' : 'minecraft';
    const state = await Gamedig.query({
      type: type,
      host: '127.0.0.1',
      port: parseInt(server.port)
    });

    return {
      online: state.players ? state.players.length : 0,
      max: state.maxplayers,
      players: state.players || []
    };
  } catch (e) {
    // If gamedig fails because server is starting or query port closed
    return { online: 0, max: 20, players: [], error: 'Unable to query server status' };
  }
}

function kickPlayer(serverId, playerName) {
  return serverManager.sendCommand(serverId, `kick ${playerName}`);
}

function banPlayer(serverId, playerName) {
  return serverManager.sendCommand(serverId, `ban ${playerName}`);
}

function opPlayer(serverId, playerName) {
  return serverManager.sendCommand(serverId, `op ${playerName}`);
}

function deopPlayer(serverId, playerName) {
  return serverManager.sendCommand(serverId, `deop ${playerName}`);
}

module.exports = {
  getPlayers,
  kickPlayer,
  banPlayer,
  opPlayer,
  deopPlayer
};
