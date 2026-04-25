import { ValidationErrorsBagException } from "@/infra/http/exceptions/validation/exception";
import { serializeValidationErrorsBag } from "@/infra/http/exceptions/validation/serialize-validation-errors";
import { ArgumentsHost, Catch, ExceptionFilter, Injectable, Scope } from "@nestjs/common";

/**
 * This exception filter presents every (nested) error from a
 * `ValidationException` thrown by some handler across the application.
 */
@Injectable({ scope: Scope.REQUEST })
@Catch(ValidationErrorsBagException)
export class ValidationErrorsBagExceptionFilter implements ExceptionFilter {
  async catch(exception: ValidationErrorsBagException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const status = exception.getStatus();
    const errors = serializeValidationErrorsBag(exception.validationErrors.getErrors());
    return ctx.getResponse().status(status).json({ errors, status });
  }
}
