# Platina Stock — Stock & Container Inventory Management

A fast, mobile-friendly inventory system for tracking stock across multiple warehouses/containers, by product, model and flavour. Built to replace spreadsheet-based stock tracking with real transaction history, low-stock alerts, and quick bulk entry.

Your existing stock report (336 SKUs across ELFBAR, TOMORO, LOST MARY, and other product lines, ~541,118 units) has already been imported into a default container called **"Platina - Main Store"**.

## Tech stack

- **Backend:** Node.js + Express + TypeScript, [Prisma ORM](https://www.prisma.io/) over **SQLite** (single-file database — zero setup, runs identically locally and in production).
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + React Query + React Router — a mobile-first single-page app.
- **Deployment:** one Node web service (the Express server serves the built React app as static files, so there's only one service to deploy).

This stack was chosen for reliability and low maintenance overhead at this scale (hundreds of SKUs, a handful of containers, moderate transaction volume): no separate database server to provision, patch, or pay for; strong typing end-to-end; and a straightforward path to Render via a persistent disk.

## Project structure

```
server/       Express API + Prisma schema/migrations + seed data (your imported stock)
client/       React frontend (Vite)
render.yaml   Render deployment blueprint
```

## Running locally

Requirements: Node.js 18+ (tested on Node 20).

```bash
# 1. Install everything (root, server, client)
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 2. Set up the database (creates server/prisma/dev.db and imports your stock data)
cd server
npm run db:migrate:dev   # first time only — creates the SQLite file & schema
npm run db:seed          # imports the 336 SKUs from your stock report
cd ..

# 3. Run both the API and the frontend dev server
npm run dev
```

- API runs at `http://localhost:4000`
- Frontend runs at `http://localhost:5173` (proxies `/api` to the backend automatically)

Open `http://localhost:5173` in your browser (or on your phone, if it's on the same network as your computer — use your computer's local IP instead of `localhost`).

If you ever want to start over with a clean database, delete `server/prisma/dev.db` and re-run the migrate + seed steps above (the seed script refuses to run again if containers already exist, to avoid duplicate imports).

## How the data is modeled

- **Container** — a warehouse, shop, vehicle, or any place stock is kept. Has a name, location, and running totals.
- **Product** — a brand + model (e.g. "ELFBAR GH23000 Disposable 850mAh Planet Edition"), with a brand, category (Disposables/Liquids/etc.) and unit.
- **Flavour** — a specific variant of a product (e.g. "Watermelon Ice"). This is the actual stock-keeping unit (SKU).
- **StockItem** — the current quantity of one flavour in one container. This is what search/filter and the dashboard read from.
- **Transaction** — an immutable log entry for every stock change (add, remove, transfer, adjust, or the original import), recording quantity, source/destination container, and the before/after balance. This is your full audit trail.

Adding, removing, or transferring stock always happens through the transaction service (`server/src/services/stockService.ts`), which updates the balance and writes the transaction record in a single atomic database transaction — so balances and history can never drift apart. Removing or transferring more than is available is blocked by default (a 409 error) unless you explicitly check "allow negative," which matches the "prevent accidental negative stock" requirement.

## Key features

- **Dashboard** — total stock, containers, low-stock alerts, stock by container/category, top products, recent activity.
- **Stock search** — filter by container, location, category, brand, product, quantity range, and low-stock only.
- **Bulk entry** — pick one product/model, then enter quantities for as many flavours as you want in one screen, for Add / Remove / Transfer, all submitted as a single batch.
- **Containers** — create containers, view their full stock breakdown and recent activity, transfer stock in/out.
- **Products** — browse/search products, drill into a product to see every flavour's stock by container and its own transaction history.
- **Transaction history** — global, filterable, paginated log of everything that ever happened to stock.
- Fully responsive: bottom tab bar and full-width touch targets on mobile, top nav on desktop.

## Deploying to Render

This repo includes a `render.yaml` blueprint, so deployment is a few clicks:

1. Push this project to a GitHub repository.
2. In Render, choose **New > Blueprint** and point it at the repo. Render will read `render.yaml` and provision:
   - One **Web Service** (`platina-stock`) that builds the client, builds the server, and serves both from a single Node process.
   - One **1 GB persistent disk** mounted at `/data`, so your SQLite database survives deploys and restarts.
3. On first deploy, the start command automatically runs the database migration and — if the database is empty — imports your original stock data, so the live app comes up pre-populated.
4. Once deployed, Render gives you a public URL for the app. No further configuration is required.

If you'd rather set it up manually instead of via the blueprint: create a Node web service, add a persistent disk at `/data`, set `DATABASE_URL=file:/data/prod.db`, build command `npm install && npm run build`, and start command `npx prisma migrate deploy --schema server/prisma/schema.prisma && npx ts-node server/prisma/seed.ts && npm run start --workspace server`.

### Note on the free Render plan

Render's free web service tier does not support persistent disks. If you deploy on the free tier, the SQLite file will reset on every deploy/restart. For a real inventory system you're actively using, use a paid instance type (the `starter` plan in `render.yaml`) so the disk — and your data — persists.
