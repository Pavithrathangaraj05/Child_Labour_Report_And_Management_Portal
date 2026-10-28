// Generates backend/.env from .env.example with fresh random secrets. Never overwrites an existing .env.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const target = path.join(__dirname, '..', '.env');
if (fs.existsSync(target)) { console.log('.env already exists - not overwriting.'); process.exit(0); }
const rnd = () => crypto.randomBytes(48).toString('hex');
const demoPw = 'Demo#' + crypto.randomBytes(6).toString('hex') + 'Aa1';
let txt = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
for (const k of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'UPLOAD_TOKEN_SECRET']) txt = txt.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${rnd()}`);
txt = txt.replace(/^SEED_PASSWORD=.*$/m, `SEED_PASSWORD=${demoPw}`);
fs.writeFileSync(target, txt, { mode: 0o600 });
console.log('Created backend/.env with random secrets.');
console.log('The demo-user password (SEED_PASSWORD) is stored in backend/.env');
