import neo4j from 'neo4j-driver';
export function getDriver() {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !username || !password) {
    throw new Error('Missing Neo4j environment variables');
  }
  return neo4j.driver(uri, neo4j.auth.basic(username, password), {
    maxConnectionPoolSize: 1, // Important for serverless
  });
}
