import { ValidationErrorsMap } from "@/common/errors/validation-errors-bag.error";

export type SerializedValidationErrorsMap = Record<string, string[] | { [key: string]: string }>;

export function serializeValidationErrorsBag(errorsMap: ValidationErrorsMap) {
  const root = {};

  for (const [fullPath, errors] of Object.entries(errorsMap)) {
    const segments = fullPath.split(".");
    let current = root;

    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;

      if (isLast) {
        current[segment] = errors.map((err) => err.errorMessage);
        return;
      }

      current[segment] = current[segment] || {};
      current = current[segment];
    });
  }

  return root;
}
