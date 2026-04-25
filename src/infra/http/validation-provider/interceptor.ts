import { HttpRequest } from "@/infra/http";
import validation, { ValidationConfig } from "@/infra/http/validation-provider";
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { PARAMTYPES_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";

@Injectable()
export class ValidationInterceptor implements NestInterceptor {
  public constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const targets = [context.getClass(), ...this.getDtoTargets(context), context.getHandler()];

    const config = this.getMergedValidatorConfigurations(targets);

    const request = context.switchToHttp().getRequest<HttpRequest>();
    validation.attachConfigsToRequest(request, config);

    return next.handle();
  }

  private getMergedValidatorConfigurations(targets: any[]) {
    return this.reflector.getAllAndMerge<ValidationConfig>(validation.metadataKey, targets);
  }

  private getDtoTargets(context: ExecutionContext) {
    const paramTypes =
      Reflect.getMetadata(PARAMTYPES_METADATA, context.getClass(), context.getHandler().name) || [];

    const dtoTargets = paramTypes.filter((paramType: unknown) => {
      return (
        paramType &&
        typeof paramType === "function" &&
        this.reflector.get(validation.metadataKey, paramType)
      );
    });

    return dtoTargets;
  }
}
