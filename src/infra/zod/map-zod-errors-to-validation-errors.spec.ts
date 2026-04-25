import { z } from "zod";
import { mapZodErrorsToValidationErrors } from ".";

describe("mapZodErrorsToValidationErrors", () => {
  it("should map a simple zod error to an validtion errors bag", () => {
    const schema = z.object({
      username: z.string().min(5, "username too short"),
    });

    const result = schema.safeParse({ username: "abc" });
    assert(!result.success, "validation should have failed");

    const bag = mapZodErrorsToValidationErrors(result.error);
    const errors = bag.getErrors();

    expect(errors).toHaveProperty("username");
    expect(errors["username"][0].errorMessage).toBe("username too short");
    expect(errors["username"][0].field).toBe("username");
  });

  it("should map nested object paths to dot notation keys", () => {
    const schema = z.object({
      auth: z.object({
        credentials: z.object({
          password: z.string().min(8, "pass too short"),
        }),
      }),
    });

    const result = schema.safeParse({ auth: { credentials: { password: "123" } } });
    assert(!result.success, "validation should have failed");

    const bag = mapZodErrorsToValidationErrors(result.error);
    const errors = bag.getErrors();

    const expectedPath = "auth.credentials.password";
    expect(errors).toHaveProperty(expectedPath);
    expect(errors[expectedPath][0].errorMessage).toBe("pass too short");
  });

  it("should map array indices to dot notation keys", () => {
    const schema = z.object({
      tags: z.array(z.string().min(3, "tag too short")),
    });

    // "hi" é demasiado curto
    const result = schema.safeParse({ tags: ["valid", "hi"] });
    assert(!result.success, "validation should have failed");

    const bag = mapZodErrorsToValidationErrors(result.error);
    const errors = bag.getErrors();

    // O zod retorna paths como ['tags', 1]. O join('.') transforma-o em "tags.1"
    const expectedPath = "tags.1";
    expect(errors).toHaveProperty(expectedPath);
    expect(errors[expectedPath][0].errorMessage).toBe("tag too short");
  });

  it("should collect multiple issues from the same zod error", () => {
    const schema = z.object({
      a: z.string(),
      b: z.number(),
    });

    const result = schema.safeParse({ a: 1, b: "string" });
    assert(!result.success, "validation should have failed");

    const bag = mapZodErrorsToValidationErrors(result.error);

    expect(Object.keys(bag.getErrors())).toHaveLength(2);
    expect(bag.getErrors()).toHaveProperty("a");
    expect(bag.getErrors()).toHaveProperty("b");
  });
});
