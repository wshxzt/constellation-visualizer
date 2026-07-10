import neo4j, { Driver } from 'neo4j-driver';
let driver: Driver | null = null;
export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI!;
    const username = process.env.NEO4J_USERNAME!;
    const password = process.env.NEO4J_PASSWORD!;
    if (!uri || !username || !password) {
      throw new Error('Missing Neo4j credentials in environment variables');
    }
    driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionPoolSize: 1,           // Important for serverless
      connectionAcquisitionTimeout: 30000,
    });
  }
  return driver;
}
