import { Argon2HasherAndComparator } from "src/infra/argon2/hasher-and-comparator";
import { randomBytes } from "node:crypto";

describe("Hasher & HashComparator", () => {
  const hasherAndComparator = new Argon2HasherAndComparator();

  it("should hash an entry", async () => {
    const entry = "foo";
    const hash = await hasherAndComparator.hash(entry);

    expect(entry).not.toBe(hash);
  });

  it("should assert an entry generates a given hash", async () => {
    const entry = "foobarbaz123";
    const hash = await hasherAndComparator.hash(entry);

    const matches = await hasherAndComparator.compare(entry, hash);
    expect(matches).toBe(true);
  });

  it.each([
    ["FooBarBaz123"], // Case sensitivity
    [randomBytes(12).toString()], // Random
    ["oobarbaz123"], // Truncated start
    ["foobarbaz12"], // Truncated end
  ])("should return `false` for invalid entry: %s", async (invalidEntry) => {
    const entry = "foobarbaz123";
    const hash = await hasherAndComparator.hash(entry);

    const matches = await hasherAndComparator.compare(invalidEntry, hash);
    expect(matches).toBe(false);
  });

  it("should generate different hashes for the same entry due to random salt", async () => {
    const entry = "foo";
    const hash1 = await hasherAndComparator.hash(entry);
    const hash2 = await hasherAndComparator.hash(entry);

    expect(hash1).not.toBe(hash2);
  });
});
