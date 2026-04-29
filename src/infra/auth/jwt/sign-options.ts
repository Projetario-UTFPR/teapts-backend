import appConfig from "@/configs/app.config";
import keysetConfig from "@/configs/keyset.config";
import { type ConfigType } from "@nestjs/config";
import { JwtVerifyOptions, type JwtSignOptions } from "@nestjs/jwt";

export function getJwtOptions(
  config: ConfigType<typeof keysetConfig>,
  app: ConfigType<typeof appConfig>,
  expiresIn: JwtSignOptions["expiresIn"] = "1h",
) {
  const signOptions = {
    algorithm: "RS256",
    issuer: app.APP_URL,
    audience: app.APP_AUDIENCE,
    expiresIn,
    privateKey: Buffer.from(config.JWT_PRIVATE_KEY, "base64"),
  } satisfies JwtSignOptions;

  const verifyOptions = {
    algorithms: ["RS256"],
    issuer: app.APP_URL,
    audience: app.APP_AUDIENCE,
    publicKey: Buffer.from(config.JWT_PUBLIC_KEY, "base64"),
    maxAge: expiresIn,
    ignoreExpiration: false,
  } satisfies JwtVerifyOptions;

  return { signOptions, verifyOptions } as const;
}
