import { JwtPayload } from "@/infra/auth/jwt/payload";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";

export const CurrentUser = createParamDecorator((_factory, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();

  const thereIsNoUser = Object.keys(request.user ?? {}).length === 0;
  if (thereIsNoUser) return null;

  return thereIsNoUser ? null : (request.user as JwtPayload);
});
