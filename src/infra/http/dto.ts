import { ValidationErrorsBag } from "@/common/errors/validation-errors-bag.error";
import { mapZodErrorsToValidationErrors } from "@/lib/zod";
import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { ZodType } from "zod";

export abstract class DTO {
  protected abstract readonly schema: ZodType;

  /**
   * Validates this `DTO` instance, ensuring it's a valid payload.
   */
  validate(): Either<ValidationErrorsBag, void> {
    const validationResult = this.schema.safeParse(this);

    if (!validationResult.success) {
      return e.left(mapZodErrorsToValidationErrors(validationResult.error));
    }

    Object.assign(this, validationResult.data);
    return e.right(undefined);
  }
}
