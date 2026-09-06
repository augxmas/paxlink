import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ quiet: true });
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!args.includes('--out') || !args.includes('--key-file')) throw new Error('Usage: node scripts/backup-database.mjs --out DIRECTORY --key-file PRIVATE_FILE [--verify]');
const out = path.resolve(option('--out')), keyFile = path.resolve(option('--key-file'));
if (keyFile.startsWith(out + path.sep)) throw new Error('Keep the recovery key outside the backup directory.');
const database = process.env.DB_NAME;
if (!database || !/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('Invalid DB_NAME.');
const personalKey = process.env.PERSONAL_DATA_ENCRYPTION_KEY;
if (!personalKey || personalKey.length < 32) throw new Error('Original PERSONAL_DATA_ENCRYPTION_KEY is required.');
const config = { host: process.env.MYSQL_HOST || process.env.DB_HOST, port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306), user: process.env.MYSQL_USER || process.env.DB_USER, password: process.env.MYSQL_PWD || process.env.DB_PASSWORD };
const childEnv = { ...process.env, MYSQL_PWD: config.password };
const common = [`--host=${config.host}`, `--port=${config.port}`, `--user=${config.user}`, '--default-character-set=utf8mb4'];
const dumpArgs = [...common, '--single-transaction', '--skip-lock-tables', '--skip-add-locks', '--routines', '--events', '--triggers', '--hex-blob', '--set-gtid-purged=OFF', '--no-tablespaces', '--column-statistics=0', '--skip-dump-date', '--skip-extended-insert'];
function dump(schemaOnly = false) {
  const r = spawnSync('mysqldump', [...dumpArgs, ...(schemaOnly ? ['--no-data'] : []), database], { env: childEnv, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`mysqldump failed: ${r.stderr}`);
  // Remove account-specific definers and source-schema qualifiers from DDL only.
  // INSERT values (including text containing SQL-like strings) remain byte-for-byte unchanged.
  return r.stdout.split('\n').map(line => line.startsWith('INSERT INTO ') ? line : line
    .replace(/DEFINER=`[^`]*`@`[^`]*`\s*/g, '')
    .replaceAll('`' + database + '`.', '')).join('\n');
}
const startedAt = new Date().toISOString();
const sql = dump(), schema = dump(true);
for (const secret of [personalKey, config.password, process.env.SUPERVISOR_PASSWORD, process.env.SMTP_PASSWORD, process.env.SMTP_PASS].filter(s => s?.length >= 8)) {
  if (schema.includes(secret)) throw new Error('Schema contains a credential; refusing to publish it.');
}
const tables = [...sql.matchAll(/^CREATE TABLE `([^`]+)`/gm)].map(m => m[1]);
const rowCounts = Object.fromEntries(tables.map(t => [t, 0]));
for (const match of sql.matchAll(/^INSERT INTO `([^`]+)` VALUES /gm)) rowCounts[match[1]]++;
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const key = crypto.randomBytes(32), iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(zlib.gzipSync(sql, { level: 9 })), cipher.final()]);
const payload = Buffer.concat([Buffer.from('PAXSQL1\n'), iv, cipher.getAuthTag(), encrypted]);
let verification = null;
if (args.includes('--verify')) {
  const testDb = `paxlink_restore_check_${Date.now()}`;
  const db = await mysql.createConnection(config);
  try {
    await db.query(`CREATE DATABASE \`${testDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const imported = spawnSync('mysql', [...common, testDb], { env: childEnv, input: sql, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    if (imported.status !== 0) throw new Error(`Restore failed: ${imported.stderr}`);
    for (const [table, expected] of Object.entries(rowCounts)) {
      const [rows] = await db.query(`SELECT COUNT(*) AS n FROM \`${testDb}\`.\`${table}\``);
      if (Number(rows[0].n) !== expected) throw new Error(`Row count mismatch: ${table}`);
    }
    await db.query('SET @paxlink_personal_data_key = ?', [personalKey]);
    const [decoded] = await db.query(`SELECT COUNT(*) AS total,SUM(name IS NOT NULL AND email IS NOT NULL) AS readable FROM \`${testDb}\`.parishioners_decrypted`);
    if (Number(decoded[0].readable || 0) !== Number(decoded[0].total)) throw new Error('Personal-data decryption check failed.');
    const [objects] = await db.query('SELECT TABLE_TYPE AS type,COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=? GROUP BY TABLE_TYPE', [testDb]);
    const [routines] = await db.query('SELECT COUNT(*) AS n FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=?', [testDb]);
    verification = { restoredAt: new Date().toISOString(), rowCountsMatched: true, personalDataDecryption: true, objects, routines: Number(routines[0].n) };
  } finally {
    // testDb is generated above, never supplied by the user or production settings.
    await db.query(`DROP DATABASE IF EXISTS \`${testDb}\``);
    await db.end();
  }
}
fs.mkdirSync(out, { recursive: true });fs.mkdirSync(path.dirname(keyFile), { recursive: true, mode: 0o700 });
fs.writeFileSync(keyFile, JSON.stringify({ format: 'paxlink-recovery-key-v1', backupKeyBase64: key.toString('base64'), personalDataEncryptionKey: personalKey, database, createdAt: startedAt }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
fs.writeFileSync(path.join(out, 'data.sql.gz.enc'), payload, { flag: 'wx' });
fs.writeFileSync(path.join(out, 'schema.sql'), schema, { flag: 'wx' });
const manifest = { format: 'paxlink-sql-backup-v1', createdAt: startedAt, database, encryption: 'AES-256-GCM', compression: 'gzip', encryptedSha256: hash(payload), sqlSha256: hash(sql), schemaSha256: hash(schema), sqlBytes: Buffer.byteLength(sql), encryptedBytes: payload.length, tableCount: tables.length, rowCounts, verification };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ backup: out, keyFile, tables: tables.length, encryptedBytes: payload.length, verified: Boolean(verification) }));
