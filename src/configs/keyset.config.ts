import { registerAs } from "@nestjs/config";
import z from "zod";

const schema = z.object({
  JWT_PUBLIC_KEY: z.string(
    "JWT_PUBLIC_KEY is a required environment variable and must be a valid base64 string.",
  ),
  JWT_PRIVATE_KEY: z.string(
    "JWT_PRIVATE_KEY is a required environment variable and must be a valid base64 string.",
  ),
});

export default registerAs("keyset", () => {
  const result = schema.parse(process.env);
  return result;
});
