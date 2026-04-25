import { ValidationErrorsBag } from "@/common/errors/validation-errors-bag.error";
import { Either } from "fp-ts/lib/Either";

export interface DTO {
  /**
   * Validates this `DTO` instance, ensuring it's a valid payload.
   */
  validate(): Either<ValidationErrorsBag, void>;
}
