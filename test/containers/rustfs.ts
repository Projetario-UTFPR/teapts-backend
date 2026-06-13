import { GenericContainer, Wait } from "testcontainers";

export async function getRustfsContainer(testId: string) {
  process.env.BLOB_STORAGE_ACCESS_KEY ??= "test_rustfs";
  process.env.BLOB_STORAGE_SECRET_KEY ??= "test_rustfs";

  try {
    const rustfsContainer = await new GenericContainer("rustfs/rustfs:latest")
      .withExposedPorts(9000) // container's internal exposed port
      .withEnvironment({
        RUSTFS_ACCESS_KEY: `${process.env.BLOB_STORAGE_ACCESS_KEY}`,
        RUSTFS_SECRET_KEY: `${process.env.BLOB_STORAGE_SECRET_KEY}`,
        RUSTFS_CONSOLE_ENABLE: "false",
        RUSTFS_SERVER_DOMAINS: "localhost",
      })
      .withWaitStrategy(Wait.forListeningPorts())
      .start();

    const port = rustfsContainer.getFirstMappedPort().toString();

    process.env.BLOB_STORAGE_PORT = port;
    process.env.BLOB_STORAGE_URL = `http://127.0.0.1:${port}`;

    process.env.DOCUMENTS_BUCKET = (process.env.DOCUMENTS_BUCKET ?? "documents") + "-" + testId;

    process.env.PROFILE_PICTURES_BUCKET =
      (process.env.PROFILE_PICTURES_BUCKET ?? "profilespics") + "-" + testId;

    process.env.BLOB_STORAGE_REGION = "us-east-1";

    return rustfsContainer;
  } catch (error) {
    console.error("Failed to start RustFS container:", error);
    throw error;
  }
}
