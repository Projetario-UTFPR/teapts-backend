import { ValidationErrorsBag } from "@/common/errors/validation-errors-bag.error";
import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * `ValidationErrorsBagException` is usually thrown when a DTO fails to validate.
 * It holds a {@link ValidationErrorsBag `ValidationErrorsBag`} and presents it as multiple
 * validation errors map.
 */
export class ValidationErrorsBagException extends HttpException {
  public constructor(
    public validationErrors: ValidationErrorsBag,
    status: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
  ) {
    super(validationErrors, status);
  }
}
