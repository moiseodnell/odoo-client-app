"use strict";

const express = require("express");
const router  = express.Router();
const db      = require("../db");
const odoo    = require("../services/odoo");

// Get Clients
router.get("/", (req, res) => {
  const clients = db.prepare("SELECT * FROM clients ORDER BY created_at DESC").all();
  res.json({ success: true, data: clients });
});

// Create Client
router.post("/", async (req, res) => {
  const { name, phone, email } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ success: false, message: "Le nom est obligatoire." });
  }

  // Insertion en local
  const stmt = db.prepare(
    "INSERT INTO clients (name, phone, email) VALUES (?, ?, ?)"
  );
  const info     = stmt.run(name.trim(), phone || null, email || null);
  const clientId = info.lastInsertRowid;

  // Synchronisation avec Odoo
  let odooPartnerId  = null;
  let odooSyncError  = null;

  try {
    odooPartnerId = await odoo.createPartner({ name: name.trim(), phone, email });
    db.prepare("UPDATE clients SET odoo_partner_id=? WHERE id=?")
      .run(odooPartnerId, clientId);
  } catch (err) {
    odooSyncError = err.message;
    console.error(`[Route /clients] Échec synchronsation Odoo pour client ${clientId}: ${err.message}`);
    db.prepare("UPDATE clients SET odoo_sync_error=? WHERE id=?")
      .run(odooSyncError, clientId);
  }

  const client = db.prepare("SELECT * FROM clients WHERE id=?").get(clientId);

  return res.status(201).json({
    success: true,
    data:    client,
    odoo: odooSyncError
      ? { synced: false, error: odooSyncError }
      : { synced: true, partner_id: odooPartnerId },
  });
});

module.exports = router;
