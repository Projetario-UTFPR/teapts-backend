import appConfig from "@/configs/app.config";
import keysetConfig from "@/configs/jwt.config";
import { AssignTokenService } from "@/infra/auth/assign-token.service";
import { JwtStrategy } from "@/infra/auth/jwt/strategy";
import { getJwtOptions } from "@/infra/auth/jwt/sign-options";
import { IdentityModule } from "@/modules/identity/identity.module";
import { Global, Module } from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "@/infra/auth/jwt/guard";
import { GetAuthCollectionQueryHandler } from "@/infra/auth/query-handlers/get-auth-collection.query";

@Global()
@Module({
  imports: [
    IdentityModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [keysetConfig.KEY, appConfig.KEY],
      useFactory: (keyset: ConfigType<typeof keysetConfig>, app: ConfigType<typeof appConfig>) => {
        const { signOptions, verifyOptions } = getJwtOptions(keyset, app);
        return {
          privateKey: Buffer.from(keyset.JWT_PRIVATE_KEY!, "base64"),
          publicKey: Buffer.from(keyset.JWT_PUBLIC_KEY!, "base64"),
          signOptions,
          verifyOptions,
        };
      },
    }),
  ],
  providers: [
    AssignTokenService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    GetAuthCollectionQueryHandler,
  ],
  exports: [AssignTokenService, GetAuthCollectionQueryHandler],
})
export class AuthModule {}
