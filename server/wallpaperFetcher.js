const DEFAULT_WALLPAPERS = [
  "/minecraft_bg.png",
  "/minecraft_bg_2.png",
  "/minecraft_bg_3.png"
];

let cachedWallpapers = [];
let lastFetchTime = 0;

async function getMinecraftWallpapers() {
  const now = Date.now();
  // Return cache if fetched within the last hour
  if (cachedWallpapers.length > 0 && (now - lastFetchTime < 3600000)) {
    return cachedWallpapers;
  }

  try {
    const res = await fetch('https://wallhaven.cc/api/v1/search?q=minecraft&sorting=views&purity=100', {
      headers: { 'User-Agent': 'MinecraftLobby/1.0' }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const urls = data.data
          .filter(item => item.path && item.file_type && item.file_type.startsWith('image/'))
          .map(item => item.path);

        if (urls.length > 0) {
          cachedWallpapers = urls;
          lastFetchTime = now;
          return cachedWallpapers;
        }
      }
    }
  } catch (e) {
    console.error("Wallhaven API error, using default wallpapers:", e.message);
  }

  return DEFAULT_WALLPAPERS;
}

module.exports = { getMinecraftWallpapers };
