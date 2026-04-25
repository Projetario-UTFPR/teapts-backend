import { InvalidArgumentError } from "@/common/errors/invalid-argument.error";
import { ValidationErrorsBag } from "@/common/errors/validation-errors-bag.error";
import { option } from "fp-ts";

describe("ValidationErrorsBag", () => {
  it("should correctly append validation errors", () => {
    const bag = new ValidationErrorsBag();
    const error = new InvalidArgumentError({ errorMessage: "msg", field: "name" });

    bag.appendError(error);

    expect(bag.getErrors()).toEqual({
      name: [error],
    });
  });

  it("should handle multiple errors for the same field", () => {
    const bag = new ValidationErrorsBag();
    bag.appendError(new InvalidArgumentError({ errorMessage: "err1", field: "email" }));
    bag.appendError(new InvalidArgumentError({ errorMessage: "err2", field: "email" }));

    expect(bag.getErrors()["email"]).toHaveLength(2);
  });

  it("should keep nested paths as flat keys", () => {
    const bag = new ValidationErrorsBag();
    const field = "user.address.street";
    const error = new InvalidArgumentError({ errorMessage: "required", field });

    bag.appendError(error);

    expect(bag.getErrors()).toHaveProperty(field);
    expect(bag.getErrors()[field][0]).toBe(error);
  });

  it("should correctly merge two bags without overriding shared branches", () => {
    const bag1 = new ValidationErrorsBag();
    bag1.appendError(new InvalidArgumentError({ errorMessage: "e1", field: "user.name" }));

    const bag2 = new ValidationErrorsBag();
    bag2.appendError(new InvalidArgumentError({ errorMessage: "e2", field: "user.email" }));

    bag1.merge(bag2);

    const errors = bag1.getErrors();
    expect(errors).toHaveProperty("user.name");
    expect(errors).toHaveProperty("user.email");
  });

  it("should pick the first error from the map", () => {
    const bag = new ValidationErrorsBag();
    const error = new InvalidArgumentError({ errorMessage: "first", field: "auth.login" });
    bag.appendError(error);

    const first = bag.pickFirstError();

    expect(option.isSome(first)).toBeTruthy();

    if (option.isSome(first)) {
      const [field, err] = first.value;
      expect(field).toBe("auth.login");
      expect(err.errorMessage).toBe("first");
    }
  });
});
