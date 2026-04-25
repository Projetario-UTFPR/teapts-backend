import validationProvider from "@/infra/http/validation-provider";
import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";

@Global()
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: validationProvider.Interceptor },
    { provide: APP_PIPE, useClass: validationProvider.Pipe },
  ],
})
export class ValidationProviderModule {}
