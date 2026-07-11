import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Spanner } from '@google-cloud/spanner';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectId = process.env.SPANNER_PROJECT_ID ?? 'zhiting-personal';
const instanceId = process.env.SPANNER_INSTANCE ?? 'constellation-instance';
const databaseId = process.env.SPANNER_DATABASE ?? 'constellation';

const stars = JSON.parse(readFileSync(join(__dirname, 'data/stars.json'), 'utf8'));
const connections = JSON.parse(readFileSync(join(__dirname, 'data/connections.json'), 'utf8'));

const spanner = new Spanner({ projectId });
const database = spanner.instance(instanceId).database(databaseId);

async function clearTables() {
  await database.runTransactionAsync(async (transaction) => {
    await transaction.runUpdate({ sql: 'DELETE FROM Connections WHERE TRUE' });
    await transaction.runUpdate({ sql: 'DELETE FROM Stars WHERE TRUE' });
    await transaction.commit();
  });
}

async function seedStars() {
  const rows = stars.map((star) => ({
    StarId: star.id,
    Name: star.name,
    X: Spanner.float(star.x),
    Y: Spanner.float(star.y),
  }));

  await database.table('Stars').insert(rows);
}

async function seedConnections() {
  const rows = connections.map((edge) => ({
    FromStarId: edge.fromStarId,
    ToStarId: edge.toStarId,
  }));

  await database.table('Connections').insert(rows);
}

async function main() {
  console.log(`Seeding ${projectId}/${instanceId}/${databaseId}...`);
  await clearTables();
  await seedStars();
  console.log(`Inserted ${stars.length} stars`);
  await seedConnections();
  console.log(`Inserted ${connections.length} connections`);
  await database.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
