# Dreams in the stars

Interactive 3D constellation explorer. Pick two bright stars and find the shortest hop path across a real sky graph — backed by either **Neo4j** or **Google Cloud Spanner Graph**.

## What it shows

- **88 real bright stars** at true RA/Dec positions on a Three.js globe
- **Constellation stick-figure edges**, plus light nearest-neighbor bridges so the graph stays connected
- Shortest-path queries via Neo4j `shortestPath` or Spanner Graph GQL `ANY SHORTEST`
- Animated starfield (meteors, rockets, satellites) behind the globe

## Repo layout

```
app/                  # Neo4j Next.js app
spanner-app/          # Spanner Next.js app
shared/               # Shared UI (globe, starfield, visualizer)
scripts/astronomy/    # Build curated sky dataset → scripts/data/
scripts/neo4j/        # Seed Neo4j from scripts/data/
scripts/spanner/      # Seed Spanner from scripts/data/
```

## Local development

### Neo4j app

```bash
# Create .env.local with:
# NEO4J_URI=...
# NEO4J_USERNAME=neo4j
# NEO4J_PASSWORD=...

npm install
npm run dev
```

Open http://localhost:3000

### Spanner app

```bash
cd spanner-app
npm install

# SPANNER_PROJECT_ID=...
# SPANNER_INSTANCE=...
# SPANNER_DATABASE=...

npm run dev
```

Application Default Credentials (or a service account) must be able to query the Spanner database.

## Astronomy data & seeding

Rebuild the shared JSON from the vendored catalog:

```bash
npm run astronomy:build
# writes scripts/data/stars.json and scripts/data/connections.json
```

Seed Neo4j:

```bash
cd scripts/neo4j && npm install
# requires NEO4J_URI / NEO4J_USERNAME / NEO4J_PASSWORD
node seed.mjs
```

Seed Spanner:

```bash
cd scripts/spanner && npm install
# optional: SPANNER_PROJECT_ID, SPANNER_INSTANCE, SPANNER_DATABASE
node seed.mjs
```

Schema for Spanner lives in `scripts/spanner/schema.ddl` (and `graph.ddl` for the property graph).

## API

Both apps expose the same routes:

| Route | Description |
| --- | --- |
| `GET /api/stars` | All stars (`id`, `name`, `x`, `y`) |
| `GET /api/connections` | Graph edges for the globe |
| `GET /api/path?start=Name&end=Name` | Shortest path between two stars |
