import appConfig from "@/configs/app.config";
import keysetConfig from "@/configs/keyset.config";
import { JwtPayload } from "@/infra/auth/jwt/payload";
import { getJwtOptions } from "@/infra/auth/jwt/sign-options";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Inject, Injectable } from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { either as e } from "fp-ts";

type Params = {
  account: Account;
};

@Injectable()
export class AssignTokenService {
  public constructor(
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
    @Inject(keysetConfig.KEY) private readonly keyset: ConfigType<typeof keysetConfig>,
    private readonly jwtService: JwtService,
  ) {}

  public async execute({ account }: Params) {
    const payload: JwtPayload = {
      sub: account.getId(),
      name: account.getName(),
    };

    const accessToken = await this.jwtService.signAsync(
      payload,
      getJwtOptions(this.keyset, this.app).signOptions,
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, refresh: true },
      getJwtOptions(this.keyset, this.app, "1d").signOptions,
    );

    return e.right({ accessToken, refreshToken });
  }
}
