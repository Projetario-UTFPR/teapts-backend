import { registerAs } from "@nestjs/config";
import z from "zod";

const schema = z.object({
  DATABASE_URL: z.url("DATABASE_URL is a required environment variable and must be a valid URL."),
});

export default registerAs("datastore", () => {
  const result = schema.parse(process.env);
  return result;
});
