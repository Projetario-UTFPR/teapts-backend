import { registerAs } from "@nestjs/config";
import z from "zod";

const schema = z.object({
  APP_NAME: z.string("APP_NAME is a required environment variable and must be a string."),
  APP_URL: z.url("URL must be a valid URL string."),
  APP_AUDIENCE: z
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

export default registerAs("app", () => schema.parse(process.env));
