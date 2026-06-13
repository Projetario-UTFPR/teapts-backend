import { DocumentFilesStorage } from "@/modules/patient/storage/document-files.storage";
import { type INestApplication } from "@nestjs/common";
import { either as e } from "fp-ts";
import type { App } from "supertest/types";
import { GetObjectCommand, GetObjectTaggingCommand, NoSuchKey, S3Client } from "@aws-sdk/client-s3";
import type { ConfigType } from "@nestjs/config";
import blobStorageConfig from "@/configs/blob-storage.config";
import { getTestingApp } from "@test/get-testing-app";

/**
 * Not a dutty of `DocumentFilesStorage` to determine the type of document that can
 * be stored, but actually a responsibility of the service.
 *
 * Thus, we gonna upload a simple .txt!
 */

describe("S3 Document Files Storage", { tags: ["integration"] }, () => {
  let app: INestApplication<App>;
  let storage: DocumentFilesStorage;
  let s3: S3Client;
  let blobVars: ConfigType<typeof blobStorageConfig>;

  beforeAll(async () => {
    app = await getTestingApp();

    storage = app.get(DocumentFilesStorage);
    s3 = app.get(S3Client);
    blobVars = app.get(blobStorageConfig.KEY);

    await app.init();
  });

  it("should provide a valid signed URL for uploading the file to a given bucket", async () => {
    const fileName = "patient-document.txt";
    const fileType = "text/plain";
    const fileBlob = new Blob([Buffer.from("Very confidential info regardig some patient.")]);
    const file = new File([fileBlob], fileName);

    const result = await storage.getSignedUploadUrl({
      fileName,
      fileType,
      fileSize: fileBlob.size,
    });

    assert(e.isRight(result), "the test expected no error at all");

    const signedUrl = result.right;

    expect(() => new URL(signedUrl.bucketUrl), "it should produce a correct URL").not.toThrow();
    expect(signedUrl.fileKey).toBeTypeOf("string");

    const response = await fetch(signedUrl.bucketUrl, {
      method: "PUT",
      body: file,
      headers: {
        "content-type": fileType,
        "content-disposition": "inline",
      },
    });

    expect(response.status).toBe(200);

    await expect(
      s3.send(new GetObjectCommand({ Key: signedUrl.fileKey, Bucket: blobVars.DOCUMENTS_BUCKET })),
    ).resolves.toBeDefined();

    const objectTaggings = await s3.send(
      new GetObjectTaggingCommand({ Key: signedUrl.fileKey, Bucket: blobVars.DOCUMENTS_BUCKET }),
    );

    expect(
      objectTaggings.TagSet?.length,
      "it should make the file temporary when uploaded but not yet activated",
    ).toBe(0);
  });

  it(
    "should require the same metadata set to the signed URL to be present when submitting " +
      "the file through the signed URL",
    async () => {
      const fileName = "patient-document.txt";
      const fileType = "text/plain";
      const fileBlob = new Blob([Buffer.from("Very confidential info regardig some patient.")]);
      const file = new File([fileBlob], fileName);

      const result = await storage.getSignedUploadUrl({
        fileName,
        fileType,
        fileSize: fileBlob.size,
      });

      assert(e.isRight(result), "the test expected no error at all");

      const signedUrl = result.right;

      const response = await fetch(signedUrl.bucketUrl, {
        method: "PUT",
        body: file,
        // missing headers that are expected by the signed url
        headers: {},
      });

      expect(response.status).toBe(403);
    },
  );

  it("should upload the file in a temporary state when directly uploaded", async ({ task }) => {
    const fileContent = "some very secret data";
    const fileName = task.id + "patient-document.txt";
    const fileType = "text/plain";

    const result = await storage.uploadPendingDocumentFile({
      fileName,
      fileType,
      document: Buffer.from(fileContent),
    });

    assert(e.isRight(result));

    const findDocumentCmd = new GetObjectCommand({
      Bucket: blobVars.DOCUMENTS_BUCKET,
      Key: result.right.fileKey,
    });

    // could throw NoSuchKey
    await expect(
      s3.send(findDocumentCmd),
      "it should have found the document",
    ).resolves.toBeDefined();
  });

  it("should activate a temporary file to make it permanent", async ({ task }) => {
    const document = Buffer.from("some very secret data");
    const fileName = task.id + "patient-document.txt";
    const fileType = "text/plain";
    const result = await storage.uploadPendingDocumentFile({ fileName, fileType, document });

    assert(e.isRight(result));

    const { fileKey } = result.right;

    const activationResult = await storage.activateDocumentFile({ fileKey });

    expect(e.isRight(activationResult)).toBe(true);

    const objectTaggings = await s3.send(
      new GetObjectTaggingCommand({ Key: fileKey, Bucket: blobVars.DOCUMENTS_BUCKET }),
    );

    expect(objectTaggings.TagSet?.length).toBeGreaterThanOrEqual(1);

    const statusTag = objectTaggings.TagSet?.find((tag) => tag.Key === "status");

    expect(statusTag).not.toBeUndefined();
    expect(statusTag!.Value).toBe("activated");
  });

  it("should delete a file", async ({ task }) => {
    const document = Buffer.from("some very secret data");
    const fileName = task.id + "patient-document.txt";
    const fileType = "text/plain";
    const result = await storage.uploadPendingDocumentFile({ fileName, fileType, document });

    assert(e.isRight(result));

    const { fileKey } = result.right;

    const deleteResult = await storage.delete({ fileKey });

    expect(e.isRight(deleteResult)).toBe(true);

    await expect(
      s3.send(new GetObjectCommand({ Key: fileKey, Bucket: blobVars.DOCUMENTS_BUCKET })),
    ).rejects.toThrow(NoSuchKey);
  });
});
