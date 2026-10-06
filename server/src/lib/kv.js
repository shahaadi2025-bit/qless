import { getDbPool, isDbConnected } from '../db.js';

// Tiny key-value store for accounts, subscriptions and payments.
// With a database connected (for example the free TiDB Cloud one) every write is saved to a single table and
// reloaded on start, so it survives restarts. Without a database it lives in memory (cleared on restart).
const mem = new Map();
let durable = false;

export async function initKv() {
  if (!isDbConnected()) {
    console.log('[kv] No database connected: accounts and payments are kept in memory (cleared on restart).');
    return;
  }
  try {
    const pool = getDbPool();
    await pool.query(
      'CREATE TABLE IF NOT EXISTS qless_kv (' +
        'k VARCHAR(190) NOT NULL PRIMARY KEY, ' +
        'v MEDIUMTEXT NOT NULL, ' +
        'updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)'
    );
    const [rows] = await pool.query('SELECT k, v FROM qless_kv');
    for (const r of rows) {
      try {
        mem.set(r.k, JSON.parse(r.v));
      } catch {
        /* skip a damaged row */
      }
    }
    durable = true;
    console.log(`[kv] Durable storage ready (${rows.length} records loaded).`);
  } catch (err) {
    console.warn('[kv] Could not prepare durable storage, using memory:', err.message);
  }
}

export function isDurable() {
  return durable;
}

export function kvGet(k) {
  const v = mem.get(k);
  return v === undefined ? null : structuredClone(v);
}

export async function kvSet(k, v) {
  mem.set(k, structuredClone(v));
  if (durable) {
    try {
      await getDbPool().query('INSERT INTO qless_kv (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [k, JSON.stringify(v)]);
    } catch (err) {
      console.warn('[kv] save failed:', err.message);
    }
  }
}

export function kvList(prefix) {
  const out = [];
  for (const [k, v] of mem.entries()) if (k.startsWith(prefix)) out.push(structuredClone(v));
  return out;
}