import appConfig from "@/configs/app.config";
import keysetConfig from "@/configs/keyset.config";
import { JwtPayload } from "@/infra/auth/jwt/payload";
import { getJwtOptions } from "@/infra/auth/jwt/sign-options";
import { Account } from "@/modules/identity/entities/account.aggregate";
import { Inject, Injectable } from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AssignTokenService {
  public constructor(
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
    @Inject(keysetConfig.KEY) private readonly keyset: ConfigType<typeof keysetConfig>,
    private readonly jwtService: JwtService,
  ) {}

  public async execute(account: Account) {
    const payload: JwtPayload = {
      sub: account.getId(),
      name: account.getName(),
    };

    return {
      accessToken: await this.jwtService.signAsync(
        payload,
        getJwtOptions(this.keyset, this.app).signOptions,
      ),
    };
  }
}
