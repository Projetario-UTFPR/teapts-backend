import { ExtractJwt, Strategy } from "passport-jwt";
import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { type ConfigType } from "@nestjs/config";
import keysetConfig from "@/configs/keyset.config";
import { JwtPayload } from "@/infra/auth/jwt/payload";
import { AccountsRepository } from "@/modules/identity/repositories/accounts.repository";
import { pipe } from "fp-ts/lib/function";
import { taskEither as te } from "fp-ts";
import { ProfessionalsRepository } from "@/modules/professional/professionals.repository";
import { AuthCollection } from "@/infra/auth/auth-collection";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(keysetConfig.KEY) private readonly config: ConfigType<typeof keysetConfig>,
    private readonly accountsRepository: AccountsRepository,
    private readonly professionalsRepository: ProfessionalsRepository,
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
      te.Do,
      te.apS("account", () => this.accountsRepository.findAccountById(payload.sub)),
      te.bindW(
        "professionalProfiles",
        ({ account }) =>
          () =>
            this.professionalsRepository.findManyByIds(account.getProfessionalIds()),
      ),
      te.map(
        ({ account, professionalProfiles }) => new AuthCollection(account, professionalProfiles),
      ),
      te.getOrElse(exceptionsFactory.fromError),
    )();
  }
}
