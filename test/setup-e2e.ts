import { getPostgreSQLContainer } from "@test/containers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import { execSync } from "child_process";
import { getRustfsContainer } from "@test/containers/rustfs";
import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";

let postgresqlContainer: StartedTestContainer;
let rustfsContainer: StartedTestContainer;

// we can't let something like _context beucase vitest throws errors
// oxlint-disable-next-line no-empty-pattern
beforeAll(async ({}, suite) => {
  postgresqlContainer = await getPostgreSQLContainer();
  execSync("npx prisma migrate deploy");

  rustfsContainer = await getRustfsContainer(suite.id);

  const s3 = new S3Client({
    endpoint: process.env.BLOB_STORAGE_URL!,
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.BLOB_STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.BLOB_STORAGE_SECRET_KEY!,
    },
    forcePathStyle: true,
  });

  await s3.send(new CreateBucketCommand({ Bucket: process.env.DOCUMENTS_BUCKET }));
  await s3.send(new CreateBucketCommand({ Bucket: process.env.PROFILE_PICTURES_BUCKET }));
}, 60000);

beforeEach(() => {
  // This resets the database so that every single test run with a fresh database instnace
  execSync("npx prisma migrate reset --force");
}, 60000);

afterAll(async () => {
  await postgresqlContainer?.stop();
  await rustfsContainer?.stop();
}, 60000);
