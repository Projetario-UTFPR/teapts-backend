import { ZodError } from "zod";
import { InvalidArgumentError } from "@/common/errors/invalid-argument.error";
import { ValidationErrorsBag } from "@/infra/http/validation/validation-errors-bag.error";

export function mapZodErrorsToValidationErrors(errors: ZodError) {
  const validationErrors = new ValidationErrorsBag();

  for (const error of errors.issues) {
    const validationError = new InvalidArgumentError({
      errorMessage: error.message,
      field: error.path.join("."),
    });

    validationErrors.appendError(validationError);
  }

  return validationErrors;
}
