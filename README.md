# LeadMachine

LeadMachine est un MVP personnel pour Brice Faradji:

- generation de brouillons LinkedIn a partir d'une idee brute
- edition et validation manuelle
- planification de publication
- publication automatique sur LinkedIn apres approbation
- stockage local rapide pour demarrer sans brancher une base

## Stack

- Next.js 16 App Router
- React 19
- stockage local JSON dans `.data/leadmachine.json`
- OpenAI Responses API en option
- OAuth LinkedIn + `w_member_social`
- cron Vercel pour publier les posts programmes

## Configuration

1. Copier le template d'environnement:

```bash
cp .env.example .env.local
```

2. Renseigner au minimum:

```bash
APP_URL=http://localhost:3000
CRON_SECRET=une-cle-secrete
```

3. Pour la generation IA, ajouter:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

4. Pour la connexion LinkedIn, ajouter:

```bash
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/linkedin/callback
LINKEDIN_API_VERSION=202603
```

## Developpement

```bash
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Publication automatique

- Tu generes un post.
- Tu le relis et l'approuves.
- Tu choisis une date.
- Le cron appelle `/api/cron/publish`.
- La route publie tous les posts `scheduled` dont la date est echue.

En local, tu peux tester le cron avec:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/publish
```

## Limite actuelle

Le stockage est local pour aller vite. Pour une vraie mise en production multi-session, remplace `.data/leadmachine.json` par une base persistante.
