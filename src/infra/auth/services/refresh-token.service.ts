import { IrrecoverableError } from "@/common/errors/irrecoverable.error";
import appConfig from "@/configs/app.config";
import jwtConfig from "@/configs/jwt.config";
import { JwtPayload } from "@/infra/auth/jwt/payload";
import { getJwtOptions } from "@/infra/auth/jwt/sign-options";
import { InvalidCredentialsError } from "@/modules/identity/errors/invalid-credentials.error";
import { Inject, Injectable } from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";

type Params = {
  refreshToken: string;
};

@Injectable()
export class RefreshTokenService {
  public constructor(
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
    @Inject(jwtConfig.KEY) private readonly keyset: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
  ) {}

  public async execute({ refreshToken }: Params) {
    return pipe(
      te.tryCatch(
        async () => (await this.jwtService.verifyAsync(refreshToken)) as JwtPayload,
        (_) => new InvalidCredentialsError(),
      ),
      te.chainW((payload) =>
        te.tryCatch(
          async () => {
            const { sub, name } = payload;
            const accessToken = await this.jwtService.signAsync(
              { sub, name },
              getJwtOptions(this.keyset, this.app).signOptions,
            );

            const refreshToken = await this.jwtService.signAsync(
              { sub, name, refresh: true },
              getJwtOptions(this.keyset, this.app, this.keyset.JWT_REFRESH_TOKEN_EXPIRATION)
                .signOptions,
            );

            return { accessToken, refreshToken, accountId: payload.sub };
          },
          (error) =>
            new IrrecoverableError({
              message: `Error occurred ${RefreshTokenService.name} when trying to sign JWTs.`,
              cause: error as Error,
            }),
        ),
      ),
    )();
  }
}
