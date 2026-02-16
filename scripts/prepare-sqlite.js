// Ensure /tmp/prisma directory exists for SQLite storage in serverless environments
try {
  const fs = require('fs');
  const path = '/tmp/prisma';
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
    console.log('[prepare-sqlite] Created', path);
  } else {
    console.log('[prepare-sqlite] Exists', path);
  }
} catch (err) {
  console.warn('[prepare-sqlite] Could not ensure /tmp/prisma:', err && err.message ? err.message : err);
}
