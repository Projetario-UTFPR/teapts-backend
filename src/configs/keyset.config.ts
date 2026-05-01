import { registerAs } from "@nestjs/config";
import z from "zod";

const schema = z.object({
  JWT_PUBLIC_KEY: z.string(
    "JWT_PUBLIC_KEY is a required environment variable and must be a valid base64 string.",
  ),
  JWT_PRIVATE_KEY: z.string(
    "JWT_PRIVATE_KEY is a required environment variable and must be a valid base64 string.",
  ),
  JWT_AUDIENCE: z
    .string("APP_AUDIENCE must be a string when present.")
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const list = val.split(",").map((s) => s.trim());
      return list.length > 0 ? (list as [string, ...string[]]) : undefined;
    })
    .refine(
      (arr) => !arr || arr.every((s) => s.length > 0),
      "APP_AUDIENCE must be a comma-separated list of non-empty strings.",
    ),
});

export default registerAs("keyset", () => {
  const result = schema.parse(process.env);
  return result;
});
