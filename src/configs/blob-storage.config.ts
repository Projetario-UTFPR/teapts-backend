import { registerAs } from "@nestjs/config";
import z from "zod";

const schema = z.object({
  BLOB_STORAGE_ACCESS_KEY: z.string(),
  BLOB_STORAGE_SECRET_KEY: z.string(),
  BLOB_STORAGE_URL: z.url(),
  DOCUMENTS_BUCKET: z.string(),
  PROFILE_PICTURES_BUCKET: z.string(),
});

export default registerAs("blobStorage", () => {
  const result = schema.parse(process.env);
  return result;
});
