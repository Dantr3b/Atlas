# Atlas

> **Système d'organisation personnel automatisé pour réduire la charge mentale.**

## 1. Problème & Vision

### Le Problème

Aucune application d'organisation existante ne correspond parfaitement à mon fonctionnement. L'objectif est de réduire la fatigue décisionnelle quotidienne liée à l'organisation.

### La Vision

**"Je capture rapidement → le système organise et priorise → je valide et j’exécute."**

Le système doit :

- Décider quoi faire maintenant.
- S'adapter au temps réellement disponible.
- Fournir un brief quotidien utilisable sans écran (audio/texte).

### Objectif Principal

👉 **Minimiser les décisions humaines au strict minimum.**

---

## 2. Règles de Conception

1.  **Friction minimale** : L'ajout de tâche doit prendre < 5 secondes.
2.  **Le système propose, l'utilisateur décide** : L'automatisation pré-mâche le travail, l'humain valide.
3.  **Fonctionnement garanti sans IA** : L'intelligence artificielle est un bonus, pas une dépendance critique.
4.  **Fallback systématique** : Données en cache, valeurs par défaut si API HS.
5.  **Champs facultatifs** : Rien ne doit bloquer la saisie rapide.

---

## 3. Périmètre MVP

### ✅ Inclus au MVP

- **Utilisateur unique** (Moi).
- **Gestion des tâches** : Ajout rapide, CRUD, Contextes (Perso/Travail/Cours).
- **Priorisation automatique** : Basée sur deadline, durée, et créneaux libres.
- **Sync Calendrier** : Google Calendar (Lecture seule) pour détecter le temps libre.
- **Brief Quotidien** : Météo, News (RSS), Agenda, Tâches du jour, État des serveurs.
- **Vues** : Inbox, Aujourd'hui, Semaine.

### ❌ Exclus du MVP

- Multi-utilisateur / Collaboration.
- Notifications complexes.
- Gamification.
- IA obligatoire.

---

## 4. Stack Technique

### Backend

- **Runtime** : Node.js
- **API** : REST (Fastify)
- **Database** : PostgreSQL
- **ORM** : Prisma 7
- **Services** : Cron pour sync, brief et health checks.
- **Conventions** :
  - **Fichiers/Dossiers** : `kebab-case` (ex: `user-profile.tsx`, `auth-service.ts`).
  - **Code JS/TS** : `camelCase` (vars/funcs), `PascalCase` (Classes/Components), `UPPER_SNAKE` (consts).
  - **DB (Postgres)** : `snake_case`.
- **Environnement** :
  - **Per-App** : `.env` local par application (pas de global).
  - **Validation** : **Strictly Typed** via `Zod` (Fail Fast au démarrage).
- **Commits** : **Conventional Commits** (`type(scope): description`).
  - Types : `feat`, `fix`, `chore`, `refactor`, `docs`, `style`.
- **AI** :
  - **Google Gemini API** : Analyse de langage naturel pour création de tâches.
  - **Rate Limiting** : Protection contre dépassement des quotas (15 req/min, 1500 req/jour).
  - **Service centralisé** : `gemini-rate-limiter.ts` réutilisable pour toutes les features IA.

### Frontend

- **Web** : React 19
- **UI/UX** : Dark theme, gradients, micro-animations
- **Architecture** : Structure par features (`features/auth`, `features/tasks`)
- **Drag-and-drop** : `@dnd-kit` pour réorganisation des tâches
- **Mobile** : React Native (prévu post-MVP)

### Services Tiers

- **Auth** :
  - **Google OAuth** : Accès simplifié + Scope Calendar.
  - **Whitelist** : Rejet de tout email non autorisé (défini dans `.env`).
  - **Session** : Cookie HttpOnly longue durée.
- **News** : Flux RSS.
- **Météo** : API externe (avec cache).

---

## 5. Fonctionnalités Clés

### ⚡ Gestion des Tâches

- **Types** : Rapide, Deep Work, Cours, Admin.
- **Statuts** : Inbox, Planifiée, En cours, Terminée.
- **Estimation** : 5min, 10min, 15min, 30min, 1h, 1h30, 2h, 3h, Plus de 3h.
- **Création rapide** :
  - Mode formulaire classique avec options avancées collapsibles
  - **Mode IA** ✨ : Saisie en langage naturel ("je dois finir le rapport avant vendredi soir") → analyse automatique avec Gemini → pré-remplissage du formulaire
- **Drag & Drop** : Réorganisation par glisser-déposer avec recalcul automatique des priorités
- **Édition/Suppression** : Click sur une tâche pour éditer ou supprimer

### 🧠 Priorisation Automatique

Le moteur décide de l'ordre des tâches en fonction de :

1.  Deadlines.
2.  Durée estimée vs Temps libre (Calendar).
3.  Priorité manuelle.

### 🎙️ Brief Matinal

Généré chaque matin (Format Texte + Compatible TTS) :

- Météo du jour (selon lieu du 1er RDV).
- Résumé Agenda & Cours.
- Top 3 Tâches prioritaires.
- Résumé actualités.
- Health Check des serveurs de dev.

### 🛠️ Health Checks

Suivi périodique de l'état des environnements de dev (Latence, Up/Down) intégré au dashboard.

---

## 6. Définition du Succès (KPIs)

- Savoir quoi faire en **< 30 secondes**.
- Ajouter une tâche en **< 5 secondes**.
- Brief du matin pertinent **sans écran**.
- Réduction drastique de l'usage direct de Google Calendar.

---

## 7. Configuration

### Variables d'environnement requises

#### Backend (`apps/api/.env`)

```bash
# Database
DATABASE_URL="postgresql://atlas:password@localhost:5432/atlas?schema=public"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/google/callback"

# Auth
ALLOWED_EMAIL="your-email@gmail.com"
SESSION_SECRET="your-session-secret-minimum-32-characters"

# Frontend
FRONTEND_URL="http://localhost:5173"

# AI (Gemini)
GEMINI_API_KEY="your-gemini-api-key"
```

#### Frontend (`apps/web/.env`)

```bash
VITE_API_URL="http://localhost:3000"
```

### Obtenir une clé API Gemini

1. Aller sur [Google AI Studio](https://aistudio.google.com/apikey)
2. Créer une nouvelle clé API (gratuit : 15 req/min, 1500 req/jour)
3. Copier la clé dans `GEMINI_API_KEY` dans `apps/api/.env`

---

## 8. Installation & Démarrage

### Prérequis

- Node.js 20+
- PostgreSQL 14+
- npm ou pnpm

### Installation

```bash
# Installer les dépendances
npm install

# Setup de la base de données
cd apps/api
npx prisma migrate dev
npx prisma db seed  # Optionnel
```

### Démarrage

```bash
# Terminal 1 : API
cd apps/api
npm run dev

# Terminal 2 : Frontend
cd apps/web
npm run dev
```

### URLs

- **Frontend** : http://localhost:5173
- **API** : http://localhost:3000
- **Health Check** : http://localhost:3000/health
