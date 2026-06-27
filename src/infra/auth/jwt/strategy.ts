import { ExtractJwt, Strategy } from "passport-jwt";
import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { type ConfigType } from "@nestjs/config";
import keysetConfig from "@/configs/jwt.config";
import { JwtPayload } from "@/infra/auth/jwt/payload";
import { pipe } from "fp-ts/lib/function";
import { taskEither as te } from "fp-ts";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { GetAuthCollectionQueryHandler } from "@/infra/auth/query-handlers/get-auth-collection.query";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(keysetConfig.KEY) private readonly config: ConfigType<typeof keysetConfig>,
    private readonly getAuthCollection: GetAuthCollectionQueryHandler,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: Buffer.from(config.JWT_PUBLIC_KEY, "base64"),
      algorithms: ["RS256"],
    });
  }

  async validate(payload: JwtPayload) {
    return pipe(
      () => this.getAuthCollection.execute({ accountId: payload.sub }),
      te.getOrElse(exceptionsFactory.fromError),
    )();
  }
}
