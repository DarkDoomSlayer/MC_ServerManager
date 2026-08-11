const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'minecraft-dashboard-secret-key-2026';
const AUTH_FILE = path.join(__dirname, '..', 'data', 'auth.json');

// Initialize default auth password if not exists
if (!fs.existsSync(AUTH_FILE)) {
  const hash = bcrypt.hashSync('admin', 10);
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ passwordHash: hash }));
}

function getPasswordHash() {
  try {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    return data.passwordHash;
  } catch (e) {
    return bcrypt.hashSync('admin', 10);
  }
}

function verifyPassword(password) {
  const hash = getPasswordHash();
  return bcrypt.compareSync(password, hash);
}

function changePassword(newPassword) {
  const hash = bcrypt.hashSync(newPassword, 10);
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ passwordHash: hash }));
}

function isDefaultPassword() {
  return verifyPassword('admin');
}

function generateToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  // Allow login endpoint, public static assets, images, and Next.js internal files
  const publicExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp', '.css', '.js'];
  if (
    req.path === '/api/auth/login' || 
    req.path === '/api/auth/check' || 
    req.path.startsWith('/_next') || 
    req.path === '/login' ||
    publicExtensions.some(ext => req.path.endsWith(ext))
  ) {
    return next();
  }

  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Redirect web requests to /login if not authenticated
    return res.redirect('/login');
  }

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    return res.redirect('/login');
  }
}

module.exports = {
  verifyPassword,
  changePassword,
  isDefaultPassword,
  generateToken,
  authMiddleware
};
