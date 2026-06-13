import { PostgreSqlContainer } from "@testcontainers/postgresql";

export async function getPostgreSQLContainer() {
  const container = await new PostgreSqlContainer("postgres:18").start();

  process.env.DB_USER = container.getUsername();
  process.env.DB_PASSWORD = container.getPassword();
  process.env.DB_NAME = container.getDatabase();
  process.env.DB_PORT = container.getPort().toString();
  process.env.DB_DOMAIN = container.getHost();
  process.env.DATABASE_URL = container.getConnectionUri();

  return container;
}
