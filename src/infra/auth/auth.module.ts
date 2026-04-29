import appConfig from "@/configs/app.config";
import keysetConfig from "@/configs/keyset.config";
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
  providers: [AssignTokenService, JwtStrategy, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [AssignTokenService],
})
export class AuthModule {}
