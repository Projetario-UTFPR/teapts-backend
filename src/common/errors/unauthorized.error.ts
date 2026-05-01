import { BaseError, IBaseError } from "./base.error";

interface IUnauthorizedError {
  message?: string;
}

const defaultMessage = "Você não está autorizado.";

export class UnauthorizedError extends BaseError implements IUnauthorizedError {
  public readonly message: string;

  public constructor(
    { message = defaultMessage }: IUnauthorizedError = {},
    options: IBaseError = {},
  ) {
    super(options);
    this.message = message;
  }
}
