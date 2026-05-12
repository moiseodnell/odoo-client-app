"use strict";

const express = require("express");
const router  = express.Router();
const db      = require("../db");
const odoo    = require("../services/odoo");

//Get orders
router.get("/", (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, c.name AS client_name
    FROM orders o
    JOIN clients c ON c.id = o.client_id
    ORDER BY o.created_at DESC
  `).all();
  res.json({ success: true, data: orders });
});

// Create Orders
router.post("/", async (req, res) => {
  const { client_id, product_name, amount } = req.body;

  if (!client_id)     return res.status(400).json({ success: false, message: "client_id est obligatoire." });
  if (!product_name)  return res.status(400).json({ success: false, message: "product_name est obligatoire." });
  if (!amount || isNaN(amount) || Number(amount) <= 0) return res.status(400).json({ success: false, message: "Le montant doit être un nombre positif." });

  const client = db.prepare("SELECT * FROM clients WHERE id=?").get(client_id);
  if (!client) return res.status(404).json({ success: false, message: "Client introuvable." });

  // Insertion locale
  const stmt = db.prepare(
    "INSERT INTO orders (client_id, product_name, amount) VALUES (?, ?, ?)"
  );
  const info    = stmt.run(client_id, product_name.trim(), Number(amount));
  const orderId = info.lastInsertRowid;

  //Synchronisation dans Odoo
  let odooOrderId   = null;
  let odooSyncError = null;

  if (!client.odoo_partner_id) {
    odooSyncError = "Client non synchronisé avec Odoo (pas de odoo_partner_id).";
    console.warn(`[Route /orders] ${odooSyncError}`);
  } else {
    try {
      odooOrderId = await odoo.createSaleOrder({
        partnerId:   client.odoo_partner_id,
        productName: product_name.trim(),
        amount:      Number(amount),
      });
      db.prepare("UPDATE orders SET odoo_order_id=? WHERE id=?")
        .run(odooOrderId, orderId);
    } catch (err) {
      odooSyncError = err.message;
      console.error(`[Route /orders] Échec sync Odoo pour order ${orderId}: ${err.message}`);
      db.prepare("UPDATE orders SET odoo_sync_error=? WHERE id=?")
        .run(odooSyncError, orderId);
    }
  }

  const order = db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);

  return res.status(201).json({
    success: true,
    data:    order,
    odoo: odooSyncError
      ? { synced: false, error: odooSyncError }
      : { synced: true, order_id: odooOrderId },
  });
});

module.exports = router;
