import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "child_process";

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:18").start();
  process.env.DATABASE_URL = container.getConnectionUri();
  execSync("npx prisma migrate deploy");
}, 60000);

beforeEach(() => {
  // This resets the database so that every single test run with a fresh database instnace
  execSync("npx prisma migrate reset --force");
}, 60000);

afterAll(async () => {
  await container?.stop();
}, 60000);
