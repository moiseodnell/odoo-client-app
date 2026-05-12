"use strict";

const Database = require("better-sqlite3");
const path     = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "app.db");


const fs = require("fs");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");


// Creation des tables de la BD
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    phone           TEXT,
    email           TEXT,
    odoo_partner_id INTEGER,
    odoo_sync_error TEXT, 
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id      INTEGER NOT NULL REFERENCES clients(id),
    product_name   TEXT    NOT NULL,
    amount         REAL    NOT NULL,
    odoo_order_id  INTEGER,           -- référence vers sale.order dans Odoo
    odoo_sync_error TEXT,
    created_at     TEXT DEFAULT (datetime('now'))
  );
`);

console.log(`Base de données Sqlite initialisée avec succès: ${DB_PATH}`);

module.exports = db;
