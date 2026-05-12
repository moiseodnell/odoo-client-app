# Description de l'application

Application web Node.js couplée à Odoo 18 via JSON-RPC.  
Elle permet de créer des clients et des commandes de vente qui sont synchronisés en temps réel dans Odoo.


## Lancer le projet

### Prérequis :
 - Docker & Docker Compose installés

Astuce: Installer Docker desktop pour avoir une visibilité.

### Étapes

```Dans le terminal: 

# 1. Cloner / Acceder au dossier du projet
cd odoo-client-app

# 2. Copier le fichier de configuration
cp .env.example .env

# 3. Démarrer tous les services
docker compose up --build -d

NB: Avoir lancé Docker avant
```

## Créer la base Odoo (une seule fois)
   - Ouvrir http://localhost:8069 dans un navigateur
   - Remplir le formulaire :
       - Master Password : admin123
       - Database Name   : odoo
       - Email           : admin@admin.com
       - Password        : admin
   - Installer le module ventes (L'installation du module Facturation se fait automatiquement) et le module facturation s'il n'est pas installé automatiquement.

## Accès à la plateforme web et à odoo

- Web App : http://localhost:3000 |
- Odoo    :http://localhost:8069 |
- pgAdmin (DB) :localhost:5433 (user: odoo) |

---

## Connexion à Odoo

- URL  :http://localhost:8069
- Email : admin@admin.com 
- Mot de passe : admin
- Base de données : odoo

---

## Objets Odoo utilisés et justification

### "res.partner"
Nous avons utilisé cet objet pour représenter les clients. C'est entre autre le modèle parfait pour representer les clients, fournisseurs et autres dans Odoo. Utiliser ce modèle garantit la compatibilité avec le CRM, la facturation et les ventes.

### "sale.order"

Nous l'avons utilisé pour les commandes de vente.  
C'est l'objet natif Odoo pour les bons de commande clients. Il est lié à un `res.partner` via `partner_id`, et contient des lignes (`sale.order.line`) avec le produit, la quantité et le prix unitaire.

### "product.product"
Nous avons utilisé cet objet pour créer le produit référencé dans la commande.  
Au lieu d'obliger l'utilisateur à configurer un catalogue produit, l'application cherche un produit existant par son nom, ou en crée un à la volée si absent. Nous l'avons mis en place pour simplifier l'expérience sans bloquer la synchronisation.

---

## Hypothèses et simplifications

- Un seul utilisateur Odoo (admin) est utilisé pour toutes les opérations API.
- Le prix est saisi directement en valeur totale (quantité = 1 par défaut).
- Permettre à l'utilisateur de créer une commande sans forcement créer au préalable un produit
