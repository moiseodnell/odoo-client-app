"use strict";

require("dotenv").config();

const express = require("express");
const path    = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, "views")));


app.use("/api/clients", require("./routes/clients"));
app.use("/api/orders",  require("./routes/orders"));


app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Gestion d'erreurs globale
app.use((err, req, res, next) => {
  console.error("Erreur non gérée:", err);
  res.status(500).json({ success: false, message: "Erreur serveur interne." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
