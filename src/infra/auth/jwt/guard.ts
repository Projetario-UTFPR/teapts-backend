import { UnauthorizedError } from "@/common/errors/unauthorized.error";
import { IS_PUBLIC_METADATA_KEY } from "@/infra/auth/decorators/public-route";
import exceptionsFactory from "@/infra/http/exceptions/exceptions-factory";
import { type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { firstValueFrom, Observable } from "rxjs";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    try {
      const result = super.canActivate(context);
      return result instanceof Observable ? await firstValueFrom(result) : await result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        const unauthorizedError = new UnauthorizedError();
        exceptionsFactory.fromError(unauthorizedError);
      }

      throw error;
    }
  }
}
