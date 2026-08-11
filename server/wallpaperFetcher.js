const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_DIR = path.join(__dirname, '..', 'public', 'cache', 'wallpapers');
const DEFAULT_WALLPAPERS = [
  "/minecraft_bg.png",
  "/minecraft_bg_2.png",
  "/minecraft_bg_3.png"
];

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

let isDownloading = false;
let lastSyncTime = 0;

// Download a single file to local disk using Mozilla User-Agent
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        file.close();
        fs.unlink(destPath, () => {});
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// Background sync for downloading high-res Minecraft wallpapers
async function syncWallpapers() {
  const now = Date.now();
  if (isDownloading || (now - lastSyncTime < 4 * 3600000)) return; // Sync every 4 hours max

  isDownloading = true;
  try {
    // Strictly search for Minecraft General Gaming wallpapers on Wallhaven
    const res = await fetch('https://wallhaven.cc/api/v1/search?q=minecraft&categories=100&purity=100&sorting=views', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        // Take top 10 high-res Minecraft wallpapers
        const topWallpapers = data.data.slice(0, 10);
        
        for (let i = 0; i < topWallpapers.length; i++) {
          const item = topWallpapers[i];
          const ext = item.file_type === 'image/png' ? '.png' : '.jpg';
          const filename = `mc_wp_${i + 1}${ext}`;
          const destPath = path.join(CACHE_DIR, filename);

          try {
            await downloadFile(item.path, destPath);
          } catch (err) {
            console.error(`Failed to cache wallpaper ${item.id}:`, err.message);
          }
        }
        lastSyncTime = now;
      }
    }
  } catch (e) {
    console.error("Background wallpaper sync failed:", e.message);
  }
  isDownloading = false;
}

// Get list of locally cached wallpaper URLs
function getMinecraftWallpapers() {
  // Trigger background sync in non-blocking way
  syncWallpapers().catch(() => {});

  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      const cached = files
        .filter(f => f.startsWith('mc_wp_') && (f.endsWith('.jpg') || f.endsWith('.png')))
        .map(f => `/cache/wallpapers/${f}`);

      if (cached.length > 0) {
        return cached;
      }
    }
  } catch (e) {
    console.error("Error reading wallpaper cache:", e.message);
  }

  return DEFAULT_WALLPAPERS;
}

module.exports = { getMinecraftWallpapers, syncWallpapers };
