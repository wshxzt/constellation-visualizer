import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import neo4j from 'neo4j-driver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stars = JSON.parse(
  readFileSync(join(__dirname, '../data/stars.json'), 'utf8'),
);
const connections = JSON.parse(
  readFileSync(join(__dirname, '../data/connections.json'), 'utf8'),
);

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME ?? 'neo4j';
const password = process.env.NEO4J_PASSWORD;

if (!uri || !password) {
  console.error('Set NEO4J_URI and NEO4J_PASSWORD (and optionally NEO4J_USERNAME).');
  process.exit(1);
}

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

async function main() {
  const session = driver.session();
  try {
    console.log('Clearing existing Star graph...');
    await session.run('MATCH (s:Star) DETACH DELETE s');

    console.log(`Inserting ${stars.length} stars...`);
    await session.run(
      `
      UNWIND $stars AS star
      CREATE (:Star {
        id: toInteger(star.id),
        name: star.name,
        x: star.x,
        y: star.y
      })
      `,
      { stars },
    );

    console.log(`Inserting ${connections.length} connections...`);
    await session.run(
      `
      UNWIND $connections AS edge
      MATCH (a:Star {id: toInteger(edge.fromStarId)})
      MATCH (b:Star {id: toInteger(edge.toStarId)})
      CREATE (a)-[:CONNECTED_TO]->(b)
      `,
      { connections },
    );

    const count = await session.run(`
      MATCH (s:Star)
      OPTIONAL MATCH (s)-[r:CONNECTED_TO]->()
      RETURN count(DISTINCT s) AS stars, count(r) AS directedEdges
    `);
    const record = count.records[0];
    console.log(
      `Done. Stars=${record.get('stars').toNumber()}, directedEdges=${record.get('directedEdges').toNumber()}`,
    );
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
