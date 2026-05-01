import appConfig from "@/configs/app.config";
import keysetConfig from "@/configs/keyset.config";
import { type ConfigType } from "@nestjs/config";
import { JwtVerifyOptions, type JwtSignOptions } from "@nestjs/jwt";

export function getJwtOptions(
  keyset: ConfigType<typeof keysetConfig>,
  app: ConfigType<typeof appConfig>,
  expiresIn: JwtSignOptions["expiresIn"] = "1h",
) {
  // we don't put the private, public key nor any secret here because we've configured it all
  // in the JwtModule.registerAsync() in the AuthModule already.
  //
  // defining them here will cause NestJS to throw an error.

  const signOptions = {
    algorithm: "RS256",
    issuer: app.APP_URL,
    expiresIn,
    ...(keyset.JWT_AUDIENCE ? { audience: keyset.JWT_AUDIENCE } : {}),
  } satisfies JwtSignOptions;

  const verifyOptions = {
    algorithms: ["RS256"],
    issuer: app.APP_URL,
    maxAge: expiresIn,
    ignoreExpiration: false,
    ...(keyset.JWT_AUDIENCE ? { audience: keyset.JWT_AUDIENCE } : {}),
  } satisfies JwtVerifyOptions;

  return { signOptions, verifyOptions } as const;
}
