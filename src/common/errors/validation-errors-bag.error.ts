import { InvalidArgumentError } from "@/common/errors/invalid-argument.error";
import { option } from "fp-ts";
import { Option } from "fp-ts/lib/Option";

export type ValidationErrorsMap = Record<string, InvalidArgumentError[]>;

export class ValidationErrorsBag {
  private errors: ValidationErrorsMap = {};

  public appendError(error: InvalidArgumentError) {
    if (!this.errors[error.field]) {
      this.errors[error.field] = [];
    }

    this.errors[error.field].push(error);
  }

  public merge(other: ValidationErrorsBag) {
    const otherErrors = other.getErrors();

    for (const [field, errors] of Object.entries(otherErrors)) {
      if (!this.errors[field]) this.errors[field] = [];
      this.errors[field].push(...errors);
    }
  }

  public getErrors() {
    return this.errors;
  }

  public pickFirstError(): Option<[string, InvalidArgumentError]> {
    const fields = Object.keys(this.errors);

    if (fields.length === 0) {
      return option.none;
    }

    const firstField = fields[0];
    const fieldErrors = this.errors[firstField];

    if (!fieldErrors || fieldErrors.length === 0) return option.none;

    return option.some([firstField, fieldErrors[0]]);
  }
}
