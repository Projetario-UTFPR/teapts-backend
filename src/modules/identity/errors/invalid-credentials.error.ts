import { UnauthorizedError } from "src/common/errors/unauthorized.error";

export class InvalidCredentialsError extends UnauthorizedError {
  public constructor() {
    super({ message: "As credenciais fornecidas são inválidas." });
  }
}
