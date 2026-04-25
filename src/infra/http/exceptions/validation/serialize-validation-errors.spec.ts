import { InvalidArgumentError } from "@/common/errors/invalid-argument.error";
import { serializeValidationErrorsBag } from "@/infra/http/exceptions/validation/serialize-validation-errors";

describe("serializeValidationErrors", () => {
  it("should transform flat dot-notation keys into a nested object structure", () => {
    const errorsMap = {
      "some.nested.arg": [
        new InvalidArgumentError({ errorMessage: "error 1", field: "some.nested.arg" }),
      ],
      "some.arg": [new InvalidArgumentError({ errorMessage: "error 1", field: "some.arg" })],
    };

    const result = serializeValidationErrorsBag(errorsMap) as any;

    expect(result).toMatchObject({
      some: {
        nested: {
          arg: [{ message: "error 1", field: "arg" }],
        },
        arg: [{ message: "error 1", field: "arg" }],
      },
    });
  });

  it("should handle deep nesting levels correctly", () => {
    const errorsMap = {
      "a.b.c.d": [new InvalidArgumentError({ errorMessage: "deep", field: "a.b.c.d" })],
    };

    const result = serializeValidationErrorsBag(errorsMap) as any;
    expect(result.a.b.c.d[0].message).toBe("deep");
  });
});
