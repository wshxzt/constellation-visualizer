import neo4j, { Driver } from 'neo4j-driver';
let driver: Driver | null = null;
export function getDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI!;
    const username = process.env.NEO4J_USERNAME!;
    const password = process.env.NEO4J_PASSWORD!;
    driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }
  return driver;
}
export async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
