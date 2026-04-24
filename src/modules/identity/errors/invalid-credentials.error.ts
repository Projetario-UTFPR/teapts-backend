import { UnauthorizedError } from "../../../common/errors/unauthorized.error";

export class InvalidCredentialsError extends UnauthorizedError {
  public constructor() {
    super({ message: "As credenciais fornecidas são inválidas." });
  }
}
