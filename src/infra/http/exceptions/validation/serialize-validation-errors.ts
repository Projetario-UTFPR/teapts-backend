import { ValidationErrorsMap } from "@/common/errors/validation-errors-bag.error";

export type SerializedValidationError = {
  message: string;
  field: string;
};

export type SerializedValidationErrorsMap = Record<
  string,
  SerializedValidationError[] | { [key: string]: SerializedValidationErrorsMap }
>;

export function serializeValidationErrorsBag(errorsMap: ValidationErrorsMap) {
  const root = {};

  for (const [fullPath, errors] of Object.entries(errorsMap)) {
    const segments = fullPath.split(".");
    let current = root;

    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;

      if (isLast) {
        current[segment] = errors.map((err) => ({
          message: err.errorMessage,
          field: segment,
        }));

        return;
      }

      current[segment] = current[segment] || {};
      current = current[segment];
    });
  }

  return root;
}
