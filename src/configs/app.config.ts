import { registerAs } from "@nestjs/config";
import z from "zod";

const schema = z.object({
  APP_NAME: z.string("APP_NAME is a required environment variable and must be a string."),
  APP_URL: z.url("URL must be a valid URL string."),
  APP_VERSION: z.string().optional(),
});

export default registerAs("app", () => schema.parse(process.env));
