"use strict";

// Fichier des appels Json-RPC vers Odoo

const ODOO_URL      = process.env.ODOO_URL;
const ODOO_DB       = process.env.ODOO_DB;
const ODOO_USER     = process.env.ODOO_USER;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD;

let _uid = null;
let _sessionId = null;

async function rpc(endpoint, params) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method:  "call",
    id:      1,
    params,
  });

  const headers = { "Content-Type": "application/json" };

  if (_sessionId) {
    headers["Cookie"] = `session_id=${_sessionId}`;
  }

  let res;
  try {
    res = await fetch(`${ODOO_URL}${endpoint}`, {
      method:  "POST",
      headers,
      body,
    });
  } catch (err) {
    const msg = `Impossible de joindre ${ODOO_URL}${endpoint} : ${err.message}`;
    console.error(msg);
    throw new Error(msg);
  }

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    const match = setCookie.match(/session_id=([^;]+)/);
    if (match) {
      _sessionId = match[1];
    }
  }

  const json = await res.json();

  if (json.error) {
    const msg = `Erreur RPC sur ${endpoint} : ${JSON.stringify(json.error)}`;
    console.error(msg);
    throw new Error(json.error.data?.message || msg);
  }

  return json.result;
}

// Fonction pour l'authentification

async function authenticate() {
  if (_uid && _sessionId) return _uid;

  const result = await rpc("/web/session/authenticate", {
    db:       ODOO_DB,
    login:    ODOO_USER,
    password: ODOO_PASSWORD,
  });

  if (!result || !result.uid) {
    throw new Error("L'authentification a échouée — vérifiez les identifiants");
  }

  console.log(`Connecté en tant que uid=${result.uid}`);
  _uid = result.uid;
  return _uid;
}


async function callModel(model, method, args = [], kwargs = {}) {
  await authenticate();
  try {
    return await rpc("/web/dataset/call_kw", { model, method, args, kwargs });
  } catch (err) {
    if (err.message.includes("Session expired") || err.message.includes("SessionExpired")) {
      console.warn("[Odoo] Session expirée, ré-authentification en cours…");
      _uid       = null;
      _sessionId = null;
      await authenticate();
      return rpc("/web/dataset/call_kw", { model, method, args, kwargs });
    }
    throw err;
  }
}

// API pour les synchronisations avec Odoo

//Creation d'un client
async function createPartner({ name, phone, email }) {
  const partnerId = await callModel("res.partner", "create", [
    {
      name,
      phone:       phone  || false,
      email:       email  || false,
      customer_rank: 1,
    },
  ]);
  console.log(`[Odoo] res.partner créé id=${partnerId}`);
  return partnerId;
}

//Lister les clients
async function listPartners() {
  return callModel(
    "res.partner",
    "search_read",
    [[["customer_rank", ">", 0]]],
    { fields: ["id", "name", "phone", "email"], limit: 200 }
  );
}

//Creation d'une ligne de commande et de produits
async function createSaleOrder({ partnerId, productName, amount }) {
  

  let [product] = await callModel(
    "product.product",
    "search_read",
    [[["name", "=", productName]]],
    { fields: ["id", "name"], limit: 1 }
  );

  let productId;
  if (product) {
    productId = product.id;
  } else {
    productId = await callModel("product.product", "create", [
      { name: productName, type: "consu", list_price: amount },
    ]);
    console.log(`product.product créé id=${productId}`);
  }

  const orderId = await callModel("sale.order", "create", [
    {
      partner_id: partnerId,
      order_line: [
        [
          0,
          0,
          {
            product_id:    productId,
            name:          productName,
            product_uom_qty: 1,
            price_unit:    amount,
          },
        ],
      ],
    },
  ]);

  console.log(`sale.order créé id=${orderId}`);
  return orderId;
}

module.exports = { createPartner, listPartners, createSaleOrder };
