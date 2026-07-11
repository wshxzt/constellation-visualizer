# Dreams in the stars

Interactive 3D constellation explorer. Pick two bright stars and find the shortest hop path across a real sky graph — backed by either **Neo4j** or **Google Cloud Spanner Graph**.

## What it shows

- **88 real bright stars** at true RA/Dec positions on a Three.js globe
- **Constellation stick-figure edges**, plus light nearest-neighbor bridges so the graph stays connected
- Shortest-path queries via Neo4j `shortestPath` or Spanner Graph GQL `ANY SHORTEST`
- Animated starfield (meteors, rockets, satellites) behind the globe

## Repo layout

```
app/           # Neo4j Next.js app
spanner-app/   # Spanner Next.js app
shared/        # Shared UI (globe, starfield, visualizer)
scripts/       # Dataset build and DB seed helpers
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

## API

Both apps expose the same routes:

| Route | Description |
| --- | --- |
| `GET /api/stars` | All stars (`id`, `name`, `x`, `y`) |
| `GET /api/connections` | Graph edges for the globe |
| `GET /api/path?start=Name&end=Name` | Shortest path between two stars |
