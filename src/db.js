// Koneksi database SQLite (module bawaan Node.js 22+)
const origEmitWarning = process.emitWarning;
process.emitWarning = function (warning, ...args) {
  if (String(warning).includes('SQLite is an experimental feature')) return;
  return origEmitWarning.call(process, warning, ...args);
};

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'd_orchid.db'));

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','karyawan','customer')),
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS orchids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  jenis TEXT NOT NULL,
  varietas TEXT DEFAULT '',
  fase TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orchid_id INTEGER NOT NULL UNIQUE REFERENCES orchids(id) ON DELETE CASCADE,
  price REAL NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','diproses','selesai','dibatalkan')),
  note TEXT DEFAULT '',
  alamat_pengiriman TEXT NOT NULL DEFAULT '',
  metode_pembayaran TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  catalog_id INTEGER REFERENCES catalog(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  price REAL NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  catalog_id INTEGER REFERENCES catalog(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  reply TEXT DEFAULT '',
  replied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  caption TEXT DEFAULT '',
  image TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
`);

/* Migrasi ringan untuk DB yang sudah ada (kolom pesanan — UC24) */
const orderCols = db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name);
if (!orderCols.includes('alamat_pengiriman')) {
  db.exec("ALTER TABLE orders ADD COLUMN alamat_pengiriman TEXT NOT NULL DEFAULT ''");
}
if (!orderCols.includes('metode_pembayaran')) {
  db.exec("ALTER TABLE orders ADD COLUMN metode_pembayaran TEXT NOT NULL DEFAULT ''");
}

module.exports = db;
