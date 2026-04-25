import { ValidationErrorsBagExceptionFilter } from "@/infra/http/exceptions/validation/filter";
import { Global, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";

@Global()
@Module({
  providers: [{ provide: APP_FILTER, useClass: ValidationErrorsBagExceptionFilter }],
})
export class ExceptionsModule {}
